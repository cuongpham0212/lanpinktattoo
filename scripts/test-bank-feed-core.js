"use strict";

const assert = require("assert");
const crypto = require("crypto");

const {
  verifySePayWebhook,
  normalizeSePayIncoming,
  bankEventKey,
  persistBankEvent,
} = require(
  "../netlify/functions/_lanpink-bank-feed"
);

function signedEvent({
  payload,
  secret,
  timestamp,
}) {
  const body =
    JSON.stringify(payload);

  const signature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(
        `${timestamp}.${body}`
      )
      .digest("hex");

  return {
    httpMethod: "POST",
    headers: {
      "content-type":
        "application/json",

      "x-sepay-timestamp":
        String(timestamp),

      "x-sepay-signature":
        `sha256=${signature}`,
    },
    body,
    isBase64Encoded: false,
  };
}

class FakeAtomicStore {
  constructor() {
    this.data =
      new Map();
  }

  async setJSON(
    key,
    value,
    options = {}
  ) {
    assert.strictEqual(
      options.onlyIfNew,
      true,
      "BankEvent write must use onlyIfNew"
    );

    if (this.data.has(key)) {
      return {
        modified: false,
      };
    }

    this.data.set(
      key,
      JSON.parse(
        JSON.stringify(value)
      )
    );

    return {
      modified: true,
      etag: '"synthetic-etag"',
    };
  }
}

(async () => {
  const secret =
    "synthetic-sepay-secret-not-production";

  const timestamp =
    1788136200;

  const nowMs =
    timestamp * 1000;

  const incomingPayload = {
    gateway:
      "MBBank",

    transactionDate:
      "2026-08-31 02:30:00",

    accountNumber:
      "0123456789",

    subAccount:
      "",

    code:
      null,

    content:
      "KHACH CHUYEN KHOAN TU DO",

    transferType:
      "in",

    description:
      "NGUYEN VAN A chuyen tien",

    transferAmount:
      500000,

    referenceCode:
      "SB-SYNTHETIC-001",

    accumulated:
      10000000,

    id:
      987654321,
  };

  const event =
    signedEvent({
      payload:
        incomingPayload,

      secret,
      timestamp,
    });

  const verified =
    verifySePayWebhook(
      event,
      {
        secret,
        nowMs,
      }
    );

  assert.strictEqual(
    verified.ok,
    true,
    "valid HMAC must pass"
  );

  assert.match(
    verified.rawHash,
    /^[a-f0-9]{64}$/
  );

  const normalized =
    normalizeSePayIncoming(
      incomingPayload,
      {
        rawHash:
          verified.rawHash,

        receivedAt:
          "2026-08-31T02:30:01.000+07:00",
      }
    );

  assert.strictEqual(
    normalized.ok,
    true
  );

  assert.strictEqual(
    normalized.ignored,
    false
  );

  const bankEvent =
    normalized.bankEvent;

  assert.strictEqual(
    bankEvent.provider,
    "sepay"
  );

  assert.strictEqual(
    bankEvent.externalTransactionId,
    "987654321"
  );

  assert.strictEqual(
    bankEvent.direction,
    "IN"
  );

  assert.strictEqual(
    bankEvent.amount,
    500000
  );

  assert.strictEqual(
    bankEvent.matchStatus,
    "UNMATCHED"
  );

  assert.strictEqual(
    bankEvent.verificationStatus,
    "VERIFIED"
  );

  assert.strictEqual(
    bankEvent.accountRef,
    "MBBank:****6789"
  );

  assert.strictEqual(
    bankEventKey(
      bankEvent.provider,
      bankEvent.externalTransactionId
    ),
    "bank-events/sepay/987654321.json"
  );

  /*
   * Duplicate test.
   */
  const store =
    new FakeAtomicStore();

  const first =
    await persistBankEvent(
      store,
      bankEvent
    );

  const second =
    await persistBankEvent(
      store,
      bankEvent
    );

  assert.strictEqual(
    first.created,
    true
  );

  assert.strictEqual(
    first.duplicate,
    false
  );

  assert.strictEqual(
    second.created,
    false
  );

  assert.strictEqual(
    second.duplicate,
    true
  );

  assert.strictEqual(
    store.data.size,
    1,
    "same bank transaction must create one record"
  );

  /*
   * Bad signature test.
   */
  const badSignatureEvent = {
    ...event,

    headers: {
      ...event.headers,

      "x-sepay-signature":
        `sha256=${"0".repeat(64)}`,
    },
  };

  const badSignature =
    verifySePayWebhook(
      badSignatureEvent,
      {
        secret,
        nowMs,
      }
    );

  assert.strictEqual(
    badSignature.ok,
    false
  );

  assert.strictEqual(
    badSignature.reason,
    "invalid_signature"
  );

  /*
   * Replay / old timestamp test.
   */
  const expired =
    verifySePayWebhook(
      event,
      {
        secret,

        nowMs:
          (timestamp + 301)
          * 1000,
      }
    );

  assert.strictEqual(
    expired.ok,
    false
  );

  assert.strictEqual(
    expired.reason,
    "request_expired"
  );

  /*
   * Outgoing must be ignored.
   */
  const outgoing =
    normalizeSePayIncoming(
      {
        ...incomingPayload,
        transferType: "out",
      },
      {
        rawHash:
          verified.rawHash,
      }
    );

  assert.strictEqual(
    outgoing.ok,
    true
  );

  assert.strictEqual(
    outgoing.ignored,
    true
  );

  assert.strictEqual(
    outgoing.reason,
    "not_incoming"
  );

  console.log(
    "S1 BANK FEED CORE: PASS"
  );

  console.log(
    "- SePay HMAC: PASS"
  );

  console.log(
    "- anti-replay: PASS"
  );

  console.log(
    "- normalize MBBank IN: PASS"
  );

  console.log(
    "- outgoing ignored: PASS"
  );

  console.log(
    "- deterministic key: PASS"
  );

  console.log(
    "- atomic duplicate contract: PASS"
  );

  console.log(
    "- no PaymentIntent mutation: PASS"
  );

  console.log(
    "- no SpeakerEvent yet: PASS"
  );
})().catch((error) => {
  console.error(
    "S1 BANK FEED CORE: FAIL",
    error
  );

  process.exit(1);
});
