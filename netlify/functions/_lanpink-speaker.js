"use strict";

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const SPEAKER_STORE_NAME = "lanpink-speaker-events";
const SPEAKER_EVENT_TYPE = "money.received";

function cleanString(value, maxLength = 300) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function cleanPositiveInteger(value) {
  const amount = Number(value);

  if (
    !Number.isSafeInteger(amount)
    || amount <= 0
  ) {
    return 0;
  }

  return amount;
}

function getSpeakerStore() {
  const options = {
    name: SPEAKER_STORE_NAME,
    consistency: "strong",
  };

  if (
    process.env.NETLIFY_SITE_ID
    && process.env.NETLIFY_AUTH_TOKEN
  ) {
    options.siteID = process.env.NETLIFY_SITE_ID;
    options.token = process.env.NETLIFY_AUTH_TOKEN;
  }

  return getStore(options);
}

function speakerEventIdForBankEvent(bankEventId) {
  const value =
    cleanString(bankEventId, 180);

  if (!/^bankevt_[a-z0-9_-]+$/i.test(value)) {
    throw new Error(
      "Invalid BankEvent id for SpeakerEvent"
    );
  }

  return `spkevt_${value}`;
}

function speakerEventKey(speakerEventId) {
  const value =
    cleanString(speakerEventId, 220);

  if (!/^spkevt_bankevt_[a-z0-9_-]+$/i.test(value)) {
    throw new Error(
      "Invalid SpeakerEvent id"
    );
  }

  return `speaker-events/${value}.json`;
}

function speakerAckKey(speakerEventId) {
  const value =
    cleanString(speakerEventId, 220);

  if (!/^spkevt_bankevt_[a-z0-9_-]+$/i.test(value)) {
    throw new Error(
      "Invalid SpeakerEvent id"
    );
  }

  return `speaker-acks/${value}.json`;
}

const DIGITS = [
  "",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

function readThreeDigits(
  value,
  forceHundreds = false
) {
  const number =
    Number(value);

  if (
    !Number.isInteger(number)
    || number < 0
    || number > 999
  ) {
    throw new Error(
      "Invalid three-digit group"
    );
  }

  if (number === 0) {
    return "";
  }

  const hundreds =
    Math.floor(number / 100);

  const tens =
    Math.floor(
      (number % 100) / 10
    );

  const units =
    number % 10;

  const words = [];

  if (hundreds > 0) {
    words.push(
      DIGITS[hundreds],
      "trăm"
    );
  } else if (forceHundreds) {
    words.push(
      "không",
      "trăm"
    );
  }

  if (tens > 1) {
    words.push(
      DIGITS[tens],
      "mươi"
    );

    if (units === 1) {
      words.push("mốt");
    } else if (units === 4) {
      words.push("tư");
    } else if (units === 5) {
      words.push("lăm");
    } else if (units > 0) {
      words.push(
        DIGITS[units]
      );
    }
  } else if (tens === 1) {
    words.push("mười");

    if (units === 5) {
      words.push("lăm");
    } else if (units > 0) {
      words.push(
        DIGITS[units]
      );
    }
  } else if (units > 0) {
    if (
      hundreds > 0
      || forceHundreds
    ) {
      words.push("lẻ");
    }

    words.push(
      DIGITS[units]
    );
  }

  return words.join(" ");
}

function amountToVietnamese(value) {
  const amount =
    cleanPositiveInteger(value);

  if (!amount) {
    throw new Error(
      "Invalid amount for speech"
    );
  }

  const units = [
    "",
    "nghìn",
    "triệu",
    "tỷ",
    "nghìn tỷ",
    "triệu tỷ",
  ];

  const groups = [];
  let remaining = amount;

  while (remaining > 0) {
    groups.push(
      remaining % 1000
    );

    remaining =
      Math.floor(
        remaining / 1000
      );
  }

  if (groups.length > units.length) {
    throw new Error(
      "Amount is too large for speech"
    );
  }

  const highestIndex =
    groups.length - 1;

  const chunks = [];

  for (
    let index = highestIndex;
    index >= 0;
    index -= 1
  ) {
    const group =
      groups[index];

    if (group === 0) {
      continue;
    }

    const text =
      readThreeDigits(
        group,
        index < highestIndex
      );

    chunks.push(
      text
    );

    if (units[index]) {
      chunks.push(
        units[index]
      );
    }
  }

  return chunks
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSpeakerEvent(
  bankEvent,
  options = {}
) {
  if (
    !bankEvent
    || typeof bankEvent !== "object"
  ) {
    throw new Error(
      "BankEvent is required"
    );
  }

  if (
    bankEvent.direction !== "IN"
    || bankEvent.verificationStatus !== "VERIFIED"
  ) {
    throw new Error(
      "Only verified incoming BankEvent can create SpeakerEvent"
    );
  }

  const amount =
    cleanPositiveInteger(
      bankEvent.amount
    );

  if (!amount) {
    throw new Error(
      "Invalid BankEvent amount"
    );
  }

  const bankEventId =
    cleanString(
      bankEvent.bankEventId,
      180
    );

  const speakerEventId =
    speakerEventIdForBankEvent(
      bankEventId
    );

  const createdAt =
    cleanString(
      options.createdAt,
      80
    )
    || new Date().toISOString();

  return {
    speakerEventId,
    bankEventId,

    eventType:
      SPEAKER_EVENT_TYPE,

    amount,

    spokenText:
      `Lan Pink đã nhận ${amountToVietnamese(amount)} đồng.`,

    createdAt,

    status:
      "PENDING",
  };
}

async function ensureSpeakerEvent(
  store,
  bankEvent,
  options = {}
) {
  const speakerEvent =
    buildSpeakerEvent(
      bankEvent,
      options
    );

  const key =
    speakerEventKey(
      speakerEvent.speakerEventId
    );

  const result =
    await store.setJSON(
      key,
      speakerEvent,
      {
        onlyIfNew: true,
      }
    );

  return {
    key,
    speakerEvent,
    created:
      Boolean(
        result?.modified
      ),
    duplicate:
      !Boolean(
        result?.modified
      ),
    etag:
      result?.etag || null,
  };
}

function safeTokenEqual(
  leftValue,
  rightValue
) {
  const left =
    crypto
      .createHash("sha256")
      .update(
        String(leftValue || "")
      )
      .digest();

  const right =
    crypto
      .createHash("sha256")
      .update(
        String(rightValue || "")
      )
      .digest();

  return crypto
    .timingSafeEqual(
      left,
      right
    );
}

function speakerAuthorization(
  event,
  options = {}
) {
  const configuredToken =
    options.token !== undefined
      ? String(options.token)
      : String(
        process.env
          .LANPINK_SPEAKER_DEVICE_TOKEN
        || ""
      );

  if (!configuredToken) {
    return {
      ok: false,
      configurationError: true,
      reason:
        "missing_device_token",
    };
  }

  const headers =
    event?.headers || {};

  let authorization = "";

  for (
    const [name, value]
    of Object.entries(headers)
  ) {
    if (
      String(name)
        .toLowerCase()
      === "authorization"
    ) {
      authorization =
        String(value || "");
      break;
    }
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  if (!match) {
    return {
      ok: false,
      reason:
        "missing_bearer_token",
    };
  }

  if (
    !safeTokenEqual(
      match[1],
      configuredToken
    )
  ) {
    return {
      ok: false,
      reason:
        "invalid_device_token",
    };
  }

  return {
    ok: true,
  };
}

async function listPendingSpeakerEvents(
  store,
  options = {}
) {
  const requestedLimit =
    Number(options.limit);

  const limit =
    Number.isSafeInteger(
      requestedLimit
    )
    && requestedLimit > 0
      ? Math.min(
        requestedLimit,
        50
      )
      : 20;

  const [
    eventListing,
    ackListing,
  ] = await Promise.all([
    store.list({
      prefix:
        "speaker-events/",
    }),

    store.list({
      prefix:
        "speaker-acks/",
    }),
  ]);

  const ackedIds =
    new Set(
      (ackListing.blobs || [])
        .map(
          (blob) =>
            blob.key
              .slice(
                "speaker-acks/"
                  .length
              )
              .replace(
                /\.json$/,
                ""
              )
        )
    );

  const pendingBlobs =
    (eventListing.blobs || [])
      .filter(
        (blob) => {
          const id =
            blob.key
              .slice(
                "speaker-events/"
                  .length
              )
              .replace(
                /\.json$/,
                ""
              );

          return (
            !ackedIds.has(id)
          );
        }
      );

  const loaded =
    await Promise.all(
      pendingBlobs.map(
        async (blob) =>
          store.get(
            blob.key,
            {
              type: "json",
              consistency:
                "strong",
            }
          )
      )
    );

  return loaded
    .filter(Boolean)
    .sort(
      (left, right) =>
        String(left.createdAt)
          .localeCompare(
            String(
              right.createdAt
            )
          )
    )
    .slice(0, limit);
}

async function acknowledgeSpeakerEvent(
  store,
  input,
  options = {}
) {
  const speakerEventId =
    cleanString(
      input?.speakerEventId,
      220
    );

  const deviceId =
    cleanString(
      input?.deviceId,
      120
    );

  if (!speakerEventId) {
    return {
      ok: false,
      reason:
        "missing_speaker_event_id",
    };
  }

  if (!deviceId) {
    return {
      ok: false,
      reason:
        "missing_device_id",
    };
  }

  let eventKey;

  try {
    eventKey =
      speakerEventKey(
        speakerEventId
      );
  } catch {
    return {
      ok: false,
      reason:
        "invalid_speaker_event_id",
    };
  }

  const speakerEvent =
    await store.get(
      eventKey,
      {
        type: "json",
        consistency: "strong",
      }
    );

  if (!speakerEvent) {
    return {
      ok: false,
      notFound: true,
      reason:
        "speaker_event_not_found",
    };
  }

  const acknowledgedAt =
    cleanString(
      options.acknowledgedAt,
      80
    )
    || new Date().toISOString();

  const ack = {
    speakerEventId,

    bankEventId:
      cleanString(
        speakerEvent.bankEventId,
        180
      ),

    status:
      "ACKED",

    deviceId,
    acknowledgedAt,
  };

  const ackKey =
    speakerAckKey(
      speakerEventId
    );

  const result =
    await store.setJSON(
      ackKey,
      ack,
      {
        onlyIfNew: true,
      }
    );

  if (result?.modified) {
    return {
      ok: true,
      ack,
      created: true,
      duplicate: false,
    };
  }

  /*
   * Duplicate ACK:
   * return the canonical ACK that won the
   * original atomic write, including its
   * original acknowledgedAt timestamp.
   */
  const existingAck =
    await store.get(
      ackKey,
      {
        type: "json",
        consistency: "strong",
      }
    );

  if (!existingAck) {
    throw new Error(
      "Canonical Speaker ACK unavailable"
    );
  }

  return {
    ok: true,
    ack: existingAck,
    created: false,
    duplicate: true,
  };
}

module.exports = {
  SPEAKER_STORE_NAME,
  SPEAKER_EVENT_TYPE,

  cleanString,
  cleanPositiveInteger,

  getSpeakerStore,

  speakerEventIdForBankEvent,
  speakerEventKey,
  speakerAckKey,

  readThreeDigits,
  amountToVietnamese,

  buildSpeakerEvent,
  ensureSpeakerEvent,

  speakerAuthorization,
  listPendingSpeakerEvents,
  acknowledgeSpeakerEvent,
};
