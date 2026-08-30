"use strict";

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");
const { PayOS } = require("@payos/node");

const PAYMENT_STORE_NAME = "lanpink-payment-intents";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type, x-lanpink-secret",
      "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function cleanString(value, maxLength = 160) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function cleanAmount(value) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount)
    || !Number.isInteger(amount)
    || amount <= 0
  ) {
    return 0;
  }

  return amount;
}

function cleanNonNegativeAmount(value) {
  const amount = Number(value);

  if (
    !Number.isFinite(amount)
    || !Number.isInteger(amount)
    || amount < 0
  ) {
    return 0;
  }

  return amount;
}

function normalizeOrderCode(value) {
  const text = String(value || "").trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const valueNumber = Number(text);

  if (
    !Number.isSafeInteger(valueNumber)
    || valueNumber <= 0
  ) {
    return null;
  }

  return valueNumber;
}

function makeOrderCode() {
  /*
   * 13-digit-ish integer:
   *
   * seconds * 1000 + random(0..999)
   *
   * - numeric as required by payOS
   * - below JS Number.MAX_SAFE_INTEGER
   * - enough uniqueness for Lanpink POS volume
   */
  return (
    Date.now() * 1000
    + crypto.randomInt(0, 1000)
  );
}

function paymentKey(orderCode) {
  return `payment-intents/${orderCode}.json`;
}

function getPaymentStore() {
  const options = {
    name: PAYMENT_STORE_NAME,
  };

  /*
   * Lanpinktattoo currently uses explicit Netlify
   * site ID/token for Blob access.
   *
   * In a Netlify runtime with automatic Blob context,
   * these options can also be omitted.
   */
  if (
    process.env.NETLIFY_SITE_ID
    && process.env.NETLIFY_AUTH_TOKEN
  ) {
    options.siteID = process.env.NETLIFY_SITE_ID;
    options.token = process.env.NETLIFY_AUTH_TOKEN;
  }

  return getStore(options);
}

function getPayOS() {
  const clientId =
    cleanString(process.env.PAYOS_CLIENT_ID, 300);

  const apiKey =
    cleanString(process.env.PAYOS_API_KEY, 500);

  const checksumKey =
    cleanString(process.env.PAYOS_CHECKSUM_KEY, 500);

  const missing = [];

  if (!clientId) {
    missing.push("PAYOS_CLIENT_ID");
  }

  if (!apiKey) {
    missing.push("PAYOS_API_KEY");
  }

  if (!checksumKey) {
    missing.push("PAYOS_CHECKSUM_KEY");
  }

  if (missing.length) {
    const error = new Error(
      `Missing payOS environment: ${missing.join(", ")}`
    );

    error.statusCode = 503;
    error.code = "PAYOS_NOT_CONFIGURED";

    throw error;
  }

  return new PayOS({
    clientId,
    apiKey,
    checksumKey,
    logLevel: "error",
  });
}

function getLanpinkSecret(event) {
  const headers = event.headers || {};

  return (
    headers["x-lanpink-secret"]
    || headers["X-Lanpink-Secret"]
    || event.queryStringParameters?.secret
    || ""
  );
}

function isPrivateRequestAuthorized(event) {
  const expected =
    cleanString(
      process.env.PAYMENT_SYNC_SECRET,
      500
    );

  const given =
    cleanString(
      getLanpinkSecret(event),
      500
    );

  if (!expected || !given) {
    return false;
  }

  const expectedBuffer =
    Buffer.from(expected);

  const givenBuffer =
    Buffer.from(given);

  if (
    expectedBuffer.length
    !== givenBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    givenBuffer
  );
}

async function loadPaymentIntent(
  store,
  orderCode
) {
  return (
    await store.get(
      paymentKey(orderCode),
      {
        type: "json",
      }
    )
  ) || null;
}

async function writePaymentIntent(
  store,
  intent
) {
  await store.setJSON(
    paymentKey(intent.orderCode),
    intent
  );

  return intent;
}

async function reservePaymentIntent(
  store,
  input
) {
  for (
    let attempt = 0;
    attempt < 12;
    attempt += 1
  ) {
    const orderCode = makeOrderCode();
    const now = new Date().toISOString();

    const intent = {
      version: 1,

      paymentId: `lp_${orderCode}`,
      provider: "payos",

      orderCode,
      status: "CREATING",

      amount: input.amount,

      memberId:
        cleanString(input.memberId, 120),

      memberCode:
        cleanString(input.memberCode, 80),

      bookingId:
        cleanString(input.bookingId, 120),

      invoiceDraftId:
        cleanString(
          input.invoiceDraftId,
          120
        ),

      paymentMethod:
        cleanString(
          input.paymentMethod,
          40
        ),

      cashAmount:
        cleanNonNegativeAmount(
          input.cashAmount
        ),

      bankTransferAmount:
        cleanNonNegativeAmount(
          input.bankTransferAmount
        ),

      clientRequestId:
        cleanString(
          input.clientRequestId,
          160
        ),

      source:
        cleanString(
          input.source || "lanpink-member",
          80
        ),

      createdAt: now,
      updatedAt: now,

      paidAt: null,

      paymentLinkId: "",
      checkoutUrl: "",
      qrCode: "",

      providerReference: "",
      providerTransactionDateTime: "",
    };

    const result = await store.setJSON(
      paymentKey(orderCode),
      intent,
      {
        onlyIfNew: true,
      }
    );

    /*
     * Netlify Blobs returns modified=false when
     * onlyIfNew prevented an overwrite.
     */
    if (
      !result
      || result.modified !== false
    ) {
      return intent;
    }
  }

  const error = new Error(
    "Could not reserve unique orderCode"
  );

  error.statusCode = 503;
  error.code = "ORDER_CODE_RESERVATION_FAILED";

  throw error;
}

function publicPaymentIntent(intent) {
  if (!intent) {
    return null;
  }

  return {
    paymentId: intent.paymentId,
    provider: intent.provider,
    orderCode: intent.orderCode,
    amount: intent.amount,
    status: intent.status,

    memberId: intent.memberId || "",
    memberCode: intent.memberCode || "",
    bookingId: intent.bookingId || "",
    invoiceDraftId:
      intent.invoiceDraftId || "",

    paymentMethod:
      intent.paymentMethod || "",

    cashAmount:
      Number(intent.cashAmount || 0),

    bankTransferAmount:
      Number(
        intent.bankTransferAmount || 0
      ),

    paymentLinkId:
      intent.paymentLinkId || "",

    checkoutUrl:
      intent.checkoutUrl || "",

    qrCode:
      intent.qrCode || "",

    createdAt:
      intent.createdAt || "",

    updatedAt:
      intent.updatedAt || "",

    paidAt:
      intent.paidAt || "",
  };
}

function safeError(error) {
  return {
    code:
      cleanString(
        error?.code
        || "INTERNAL_ERROR",
        120
      ),

    message:
      cleanString(
        error?.message
        || "Internal error",
        300
      ),

    providerDesc:
      cleanString(
        error?.desc || "",
        200
      ),
  };
}

module.exports = {
  json,

  cleanString,
  cleanAmount,
  cleanNonNegativeAmount,
  normalizeOrderCode,

  getPaymentStore,
  getPayOS,

  isPrivateRequestAuthorized,

  loadPaymentIntent,
  writePaymentIntent,
  reservePaymentIntent,

  publicPaymentIntent,
  safeError,
};
