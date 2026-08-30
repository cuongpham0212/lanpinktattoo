"use strict";

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const BANK_EVENT_STORE_NAME = "lanpink-bank-events";
const SEPAY_PROVIDER = "sepay";
const SEPAY_MAX_SKEW_SECONDS = 300;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function cleanString(value, maxLength = 500) {
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

function normalizeExternalTransactionId(value) {
  const text = cleanString(value, 120);

  if (
    !/^\d+$/.test(text)
    || /^0+$/.test(text)
  ) {
    return "";
  }

  return text;
}

function getHeader(event, wantedName) {
  const headers = event?.headers || {};
  const wanted = String(wantedName).toLowerCase();

  for (const [name, value] of Object.entries(headers)) {
    if (String(name).toLowerCase() === wanted) {
      return String(value ?? "");
    }
  }

  return "";
}

/*
 * IMPORTANT:
 * SePay signs the RAW HTTP body.
 * Do not JSON.parse + JSON.stringify before verification.
 */
function getRawBodyBuffer(event) {
  const body = event?.body ?? "";

  if (event?.isBase64Encoded) {
    return Buffer.from(String(body), "base64");
  }

  return Buffer.from(String(body), "utf8");
}

function sha256Hex(input) {
  return crypto
    .createHash("sha256")
    .update(input)
    .digest("hex");
}

function safeTimingEqualHex(leftHex, rightHex) {
  if (
    !/^[a-fA-F0-9]{64}$/.test(leftHex)
    || !/^[a-fA-F0-9]{64}$/.test(rightHex)
  ) {
    return false;
  }

  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");

  return (
    left.length === right.length
    && crypto.timingSafeEqual(left, right)
  );
}

function verifySePayWebhook(
  event,
  options = {}
) {
  const secret =
    options.secret !== undefined
      ? String(options.secret)
      : String(process.env.SEPAY_WEBHOOK_SECRET || "");

  if (!secret) {
    return {
      ok: false,
      configurationError: true,
      reason: "missing_webhook_secret",
    };
  }

  const signature =
    cleanString(
      getHeader(event, "x-sepay-signature"),
      200
    );

  const timestampText =
    cleanString(
      getHeader(event, "x-sepay-timestamp"),
      40
    );

  if (!/^\d+$/.test(timestampText)) {
    return {
      ok: false,
      reason: "invalid_timestamp",
    };
  }

  const timestamp = Number(timestampText);

  if (
    !Number.isSafeInteger(timestamp)
    || timestamp <= 0
  ) {
    return {
      ok: false,
      reason: "invalid_timestamp",
    };
  }

  const nowMs =
    options.nowMs !== undefined
      ? Number(options.nowMs)
      : Date.now();

  const nowSeconds =
    Math.floor(nowMs / 1000);

  if (
    Math.abs(nowSeconds - timestamp)
    > SEPAY_MAX_SKEW_SECONDS
  ) {
    return {
      ok: false,
      reason: "request_expired",
    };
  }

  if (!signature.startsWith("sha256=")) {
    return {
      ok: false,
      reason: "invalid_signature_format",
    };
  }

  const providedHex =
    signature.slice("sha256=".length);

  const rawBody =
    getRawBodyBuffer(event);

  const signedPrefix =
    Buffer.from(
      `${timestamp}.`,
      "utf8"
    );

  const expectedHex =
    crypto
      .createHmac("sha256", secret)
      .update(
        Buffer.concat([
          signedPrefix,
          rawBody,
        ])
      )
      .digest("hex");

  if (
    !safeTimingEqualHex(
      providedHex,
      expectedHex
    )
  ) {
    return {
      ok: false,
      reason: "invalid_signature",
    };
  }

  return {
    ok: true,
    timestamp,
    rawBody,
    rawHash:
      sha256Hex(rawBody),
  };
}

function maskAccountNumber(value) {
  const accountNumber =
    cleanString(value, 120);

  if (!accountNumber) {
    return "";
  }

  const last4 =
    accountNumber.slice(-4);

  return `****${last4}`;
}

function makeBankEventId(
  provider,
  externalTransactionId
) {
  return [
    "bankevt",
    cleanString(provider, 40).toLowerCase(),
    normalizeExternalTransactionId(
      externalTransactionId
    ),
  ].join("_");
}

function bankEventKey(
  provider,
  externalTransactionId
) {
  const safeProvider =
    cleanString(provider, 40)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

  const safeId =
    normalizeExternalTransactionId(
      externalTransactionId
    );

  if (!safeProvider || !safeId) {
    throw new Error(
      "Invalid BankEvent identity"
    );
  }

  return (
    `bank-events/${safeProvider}/${safeId}.json`
  );
}

function normalizeSePayIncoming(
  payload,
  options = {}
) {
  if (
    !payload
    || typeof payload !== "object"
    || Array.isArray(payload)
  ) {
    return {
      ok: false,
      reason: "invalid_payload",
    };
  }

  const transferType =
    cleanString(
      payload.transferType,
      20
    ).toLowerCase();

  /*
   * A webhook may accidentally be configured for
   * both directions.
   *
   * Outgoing money must NEVER create a BankEvent
   * for Speaker Core.
   */
  if (transferType !== "in") {
    return {
      ok: true,
      ignored: true,
      reason: "not_incoming",
    };
  }

  const externalTransactionId =
    normalizeExternalTransactionId(
      payload.id
    );

  if (!externalTransactionId) {
    return {
      ok: false,
      reason:
        "invalid_external_transaction_id",
    };
  }

  const amount =
    cleanPositiveInteger(
      payload.transferAmount
    );

  if (!amount) {
    return {
      ok: false,
      reason: "invalid_amount",
    };
  }

  const gateway =
    cleanString(
      payload.gateway,
      80
    );

  if (!gateway) {
    return {
      ok: false,
      reason: "missing_gateway",
    };
  }

  const transactionTime =
    cleanString(
      payload.transactionDate,
      80
    );

  if (!transactionTime) {
    return {
      ok: false,
      reason:
        "missing_transaction_time",
    };
  }

  const accountNumber =
    cleanString(
      payload.accountNumber,
      120
    );

  if (!accountNumber) {
    return {
      ok: false,
      reason:
        "missing_account_number",
    };
  }

  const receivedAt =
    cleanString(
      options.receivedAt,
      80
    )
    || new Date().toISOString();

  const rawHash =
    cleanString(
      options.rawHash,
      128
    );

  if (!rawHash) {
    return {
      ok: false,
      reason: "missing_raw_hash",
    };
  }

  const provider =
    SEPAY_PROVIDER;

  const bankEvent = {
    bankEventId:
      makeBankEventId(
        provider,
        externalTransactionId
      ),

    provider,
    externalTransactionId,

    providerReference:
      cleanString(
        payload.referenceCode,
        200
      )
      || null,

    bankGateway:
      gateway,

    direction:
      "IN",

    amount,

    description:
      cleanString(
        payload.description
        || payload.content,
        500
      ),

    transferContent:
      cleanString(
        payload.content,
        500
      ),

    providerCode:
      cleanString(
        payload.code,
        160
      )
      || null,

    transactionTime,
    receivedAt,

    accountRef:
      `${gateway}:${maskAccountNumber(
        accountNumber
      )}`,

    rawHash,

    verificationStatus:
      "VERIFIED",

    matchStatus:
      "UNMATCHED",

    matchedPaymentId:
      null,

    matchedOrderCode:
      null,
  };

  return {
    ok: true,
    ignored: false,
    bankEvent,
  };
}

function getBankEventStore() {
  const options = {
    name:
      BANK_EVENT_STORE_NAME,

    /*
     * Reads are not required to win idempotency.
     * onlyIfNew is the atomic boundary.
     *
     * Strong consistency is still useful for
     * later inspection / Speaker Core reads.
     */
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

/*
 * BANK EVENT IDEMPOTENCY BOUNDARY
 *
 * Netlify Blobs v10+:
 * setJSON(..., { onlyIfNew: true })
 *
 * Exactly one concurrent request is allowed to
 * create this deterministic key.
 */
async function persistBankEvent(
  store,
  bankEvent
) {
  const key =
    bankEventKey(
      bankEvent.provider,
      bankEvent.externalTransactionId
    );

  const result =
    await store.setJSON(
      key,
      bankEvent,
      {
        onlyIfNew: true,
      }
    );

  return {
    key,
    created:
      Boolean(result?.modified),
    duplicate:
      !Boolean(result?.modified),
    etag:
      result?.etag || null,
  };
}

function safeError(error) {
  return {
    name:
      cleanString(
        error?.name,
        100
      ),

    code:
      cleanString(
        error?.code,
        100
      ),

    message:
      cleanString(
        error?.message,
        300
      ),
  };
}

module.exports = {
  BANK_EVENT_STORE_NAME,
  SEPAY_PROVIDER,
  SEPAY_MAX_SKEW_SECONDS,

  json,
  cleanString,
  cleanPositiveInteger,
  normalizeExternalTransactionId,

  getHeader,
  getRawBodyBuffer,
  sha256Hex,

  verifySePayWebhook,
  normalizeSePayIncoming,

  makeBankEventId,
  bankEventKey,

  getBankEventStore,
  persistBankEvent,

  safeError,
};
