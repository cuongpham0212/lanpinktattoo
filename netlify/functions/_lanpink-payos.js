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


const PAYMENT_STATUSES = new Set([
  "CREATING",
  "PENDING",
  "PAID",
  "CANCELLED",
  "EXPIRED",
  "CREATE_FAILED",
]);


function clientRequestKey(clientRequestId) {
  const value =
    cleanString(
      clientRequestId,
      160
    );

  if (!value) {
    return "";
  }

  const digest =
    crypto
      .createHash("sha256")
      .update(value)
      .digest("hex");

  return (
    `payment-client-requests/${digest}.json`
  );
}


function paymentInputSnapshot(input) {
  return {
    amount:
      cleanAmount(
        input.amount
      ),

    memberId:
      cleanString(
        input.memberId,
        120
      ),

    memberCode:
      cleanString(
        input.memberCode,
        80
      ),

    bookingId:
      cleanString(
        input.bookingId,
        120
      ),

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
  };
}


function paymentInputFingerprint(input) {
  const payload =
    JSON.stringify(
      paymentInputSnapshot(input)
    );

  return crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");
}


function normalizePaymentStatus(
  value,
  fallback = "PENDING"
) {
  const status =
    cleanString(
      value,
      40
    ).toUpperCase();

  if (PAYMENT_STATUSES.has(status)) {
    return status;
  }

  const fallbackStatus =
    cleanString(
      fallback,
      40
    ).toUpperCase();

  if (
    PAYMENT_STATUSES.has(
      fallbackStatus
    )
  ) {
    return fallbackStatus;
  }

  return "PENDING";
}


function canTransitionPaymentStatus(
  fromValue,
  toValue
) {
  const from =
    normalizePaymentStatus(
      fromValue,
      "CREATING"
    );

  const to =
    normalizePaymentStatus(
      toValue,
      from
    );

  if (from === to) {
    return true;
  }

  /*
   * PAID is final.
   *
   * CANCELLED / EXPIRED are also closed states.
   * A closed QR must not later be re-used by Member.
   */
  if (
    from === "PAID"
    || from === "CANCELLED"
    || from === "EXPIRED"
    || from === "CREATE_FAILED"
  ) {
    return false;
  }

  if (from === "CREATING") {
    return [
      "PENDING",
      "PAID",
      "CANCELLED",
      "EXPIRED",
      "CREATE_FAILED",
    ].includes(to);
  }

  if (from === "PENDING") {
    return [
      "PAID",
      "CANCELLED",
      "EXPIRED",
      "CREATE_FAILED",
    ].includes(to);
  }

  return false;
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

function buildPaymentIntent(
  orderCode,
  input
) {
  const now =
    new Date().toISOString();

  const snapshot =
    paymentInputSnapshot(
      input
    );

  const clientRequestId =
    cleanString(
      input.clientRequestId,
      160
    );

  return {
    version: 2,

    paymentId:
      `lp_${orderCode}`,

    provider: "payos",

    orderCode,
    status: "CREATING",

    amount:
      snapshot.amount,

    memberId:
      snapshot.memberId,

    memberCode:
      snapshot.memberCode,

    bookingId:
      snapshot.bookingId,

    invoiceDraftId:
      snapshot.invoiceDraftId,

    paymentMethod:
      snapshot.paymentMethod,

    cashAmount:
      snapshot.cashAmount,

    bankTransferAmount:
      snapshot.bankTransferAmount,

    clientRequestId,

    clientRequestFingerprint:
      paymentInputFingerprint(
        input
      ),

    source:
      cleanString(
        input.source
        || "lanpink-member",
        80
      ),

    createdAt: now,
    updatedAt: now,

    paidAt: null,
    cancelledAt: null,
    expiredAt: null,

    paymentLinkId: "",
    checkoutUrl: "",
    qrCode: "",

    providerReference: "",
    providerTransactionDateTime: "",
  };
}


/*
 * CREATE IDEMPOTENCY
 *
 * One clientRequestId owns one orderCode.
 *
 * Two concurrent callers may race, but only the caller
 * which successfully creates paymentKey(orderCode)
 * receives created=true and is therefore allowed to
 * call payOS.paymentRequests.create().
 */
async function reservePaymentIntent(
  store,
  input
) {
  const clientRequestId =
    cleanString(
      input.clientRequestId,
      160
    );

  if (!clientRequestId) {
    const error =
      new Error(
        "clientRequestId is required"
      );

    error.statusCode = 400;
    error.code =
      "CLIENT_REQUEST_ID_REQUIRED";

    throw error;
  }

  const requestKey =
    clientRequestKey(
      clientRequestId
    );

  const fingerprint =
    paymentInputFingerprint(
      input
    );

  const proposedOrderCode =
    makeOrderCode();

  const requestRecord = {
    version: 1,

    orderCode:
      proposedOrderCode,

    fingerprint,

    createdAt:
      new Date().toISOString(),
  };

  const requestResult =
    await store.setJSON(
      requestKey,
      requestRecord,
      {
        onlyIfNew: true,
      }
    );

  const requestWasCreated = (
    !requestResult
    || requestResult.modified !== false
  );

  let ownerRecord =
    requestRecord;

  if (!requestWasCreated) {
    ownerRecord =
      await store.get(
        requestKey,
        {
          type: "json",
        }
      );

    if (!ownerRecord) {
      const error =
        new Error(
          "Idempotency reservation unavailable"
        );

      error.statusCode = 503;
      error.code =
        "IDEMPOTENCY_RESERVATION_UNAVAILABLE";

      throw error;
    }

    if (
      cleanString(
        ownerRecord.fingerprint,
        200
      )
      !== fingerprint
    ) {
      const error =
        new Error(
          "clientRequestId was already used "
          + "for different payment data"
        );

      error.statusCode = 409;
      error.code =
        "IDEMPOTENCY_CONFLICT";

      throw error;
    }
  }

  const orderCode =
    normalizeOrderCode(
      ownerRecord.orderCode
    );

  if (!orderCode) {
    const error =
      new Error(
        "Invalid idempotency orderCode"
      );

    error.statusCode = 500;
    error.code =
      "IDEMPOTENCY_ORDER_CODE_INVALID";

    throw error;
  }

  /*
   * Fast path:
   * an earlier request already owns/created the intent.
   */
  const existing =
    await loadPaymentIntent(
      store,
      orderCode
    );

  if (existing) {
    return {
      intent: existing,
      created: false,
      idempotent: true,
    };
  }

  /*
   * The idempotency record can exist before the PaymentIntent.
   *
   * This second onlyIfNew is the provider-call ownership lock.
   * Only its winner may contact payOS.
   */
  const intent =
    buildPaymentIntent(
      orderCode,
      {
        ...input,
        clientRequestId,
      }
    );

  const paymentResult =
    await store.setJSON(
      paymentKey(orderCode),
      intent,
      {
        onlyIfNew: true,
      }
    );

  const paymentWasCreated = (
    !paymentResult
    || paymentResult.modified !== false
  );

  if (paymentWasCreated) {
    return {
      intent,
      created: true,
      idempotent:
        !requestWasCreated,
    };
  }

  const racedIntent =
    await loadPaymentIntent(
      store,
      orderCode
    );

  if (!racedIntent) {
    const error =
      new Error(
        "PaymentIntent reservation unavailable"
      );

    error.statusCode = 503;
    error.code =
      "PAYMENT_RESERVATION_UNAVAILABLE";

    throw error;
  }

  return {
    intent: racedIntent,
    created: false,
    idempotent: true,
  };
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
    status:
      normalizePaymentStatus(
        intent.status,
        "PENDING"
      ),

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

    clientRequestId:
      intent.clientRequestId || "",

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

    cancelledAt:
      intent.cancelledAt || "",

    expiredAt:
      intent.expiredAt || "",
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

  clientRequestKey,
  paymentInputFingerprint,
  normalizePaymentStatus,
  canTransitionPaymentStatus,

  getPaymentStore,
  getPayOS,

  isPrivateRequestAuthorized,

  loadPaymentIntent,
  writePaymentIntent,
  reservePaymentIntent,

  publicPaymentIntent,
  safeError,
};
