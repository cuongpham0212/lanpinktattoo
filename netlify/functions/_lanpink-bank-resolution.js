"use strict";

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const {
  getHeader,
  bankEventKey,
} = require("./_lanpink-bank-feed");

const BANK_RESOLUTION_STORE_NAME =
  "lanpink-bank-event-resolutions";

function cleanString(value, maxLength = 300) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function getBankResolutionStore() {
  const options = {
    name:
      BANK_RESOLUTION_STORE_NAME,
    consistency:
      "strong",
  };

  if (
    process.env.NETLIFY_SITE_ID
    && process.env.NETLIFY_AUTH_TOKEN
  ) {
    options.siteID =
      process.env.NETLIFY_SITE_ID;

    options.token =
      process.env.NETLIFY_AUTH_TOKEN;
  }

  return getStore(options);
}

function resolutionKey(bankEventId) {
  const value =
    cleanString(
      bankEventId,
      180
    );

  if (
    !/^bankevt_[a-z0-9_-]+$/i.test(
      value
    )
  ) {
    throw new Error(
      "Invalid BankEvent id"
    );
  }

  return `resolutions/${value}.json`;
}

function bankEventStorageKeyFromId(
  bankEventId
) {
  const value =
    cleanString(
      bankEventId,
      180
    );

  const match =
    /^bankevt_([a-z0-9-]+)_(\d+)$/i
      .exec(value);

  if (!match) {
    throw new Error(
      "Invalid BankEvent id"
    );
  }

  return bankEventKey(
    match[1],
    match[2]
  );
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

  return crypto.timingSafeEqual(
    left,
    right
  );
}

function writeAuthorization(event) {
  const configured =
    String(
      process.env
        .LANPINK_BANK_FEED_WRITE_SECRET
      || ""
    );

  if (!configured) {
    return {
      ok: false,
      configurationError: true,
    };
  }

  const provided =
    getHeader(
      event,
      "x-lanpink-secret"
    );

  return {
    ok:
      Boolean(provided)
      && safeTokenEqual(
        provided,
        configured
      ),
    configurationError: false,
  };
}

function buildIgnoredResolution(
  bankEvent,
  options = {}
) {
  if (
    !bankEvent
    || bankEvent.direction !== "IN"
    || bankEvent.verificationStatus
      !== "VERIFIED"
    || bankEvent.matchStatus
      !== "UNMATCHED"
  ) {
    throw new Error(
      "BankEvent is not resolvable"
    );
  }

  return {
    bankEventId:
      cleanString(
        bankEvent.bankEventId,
        180
      ),

    resolutionStatus:
      "IGNORED",

    resolvedAt:
      cleanString(
        options.resolvedAt,
        80
      )
      || new Date().toISOString(),

    source:
      "lanpink-member",

    note:
      cleanString(
        options.note,
        300
      ),
  };
}

function buildMatchedResolution(
  bankEvent,
  options = {}
) {
  if (
    !bankEvent
    || bankEvent.direction !== "IN"
    || bankEvent.verificationStatus !== "VERIFIED"
    || bankEvent.matchStatus !== "UNMATCHED"
  ) {
    throw new Error(
      "BankEvent is not resolvable"
    );
  }

  const memberId =
    cleanString(
      options.memberId,
      180
    );

  const invoiceCode =
    cleanString(
      options.invoiceCode,
      180
    );

  const amount =
    Number(bankEvent.amount);

  if (
    !memberId
    || !invoiceCode
    || !Number.isSafeInteger(amount)
    || amount <= 0
  ) {
    throw new Error(
      "Invalid matched resolution"
    );
  }

  return {
    bankEventId:
      cleanString(
        bankEvent.bankEventId,
        180
      ),

    resolutionStatus:
      "MATCHED",

    resolvedAt:
      cleanString(
        options.resolvedAt,
        80
      )
      || new Date().toISOString(),

    source:
      "lanpink-member",

    memberId,
    invoiceCode,
    amount,

    note:
      cleanString(
        options.note,
        300
      ),
  };
}


async function persistResolution(
  store,
  resolution
) {
  const key =
    resolutionKey(
      resolution.bankEventId
    );

  const result =
    await store.setJSON(
      key,
      resolution,
      {
        onlyIfNew: true,
      }
    );

  if (result?.modified) {
    return {
      key,
      created: true,
      duplicate: false,
      resolution,
    };
  }

  const canonical =
    await store.get(
      key,
      {
        type: "json",
        consistency: "strong",
      }
    );

  return {
    key,
    created: false,
    duplicate: true,
    resolution:
      canonical || resolution,
  };
}

async function listResolvedBankEventIds(
  store
) {
  const listed =
    await store.list({
      prefix: "resolutions/",
    });

  const ids =
    new Set();

  for (
    const blob
    of listed.blobs || []
  ) {
    const key =
      String(blob.key || "");

    if (
      key.startsWith(
        "resolutions/"
      )
      && key.endsWith(".json")
    ) {
      ids.add(
        key.slice(
          "resolutions/".length,
          -".json".length
        )
      );
    }
  }

  return ids;
}

module.exports = {
  BANK_RESOLUTION_STORE_NAME,

  getBankResolutionStore,
  resolutionKey,
  bankEventStorageKeyFromId,

  writeAuthorization,
  buildIgnoredResolution,
  buildMatchedResolution,
  persistResolution,
  listResolvedBankEventIds,
};
