"use strict";

const assert =
  require("assert");

const {
  reservePaymentIntent,
  canTransitionPaymentStatus,
  publicPaymentIntent,
} = require(
  "../netlify/functions/_lanpink-payos"
);


class FakeStore {
  constructor() {
    this.map = new Map();
  }

  async get(
    key,
    options = {}
  ) {
    void options;

    if (!this.map.has(key)) {
      return null;
    }

    return JSON.parse(
      JSON.stringify(
        this.map.get(key)
      )
    );
  }

  async setJSON(
    key,
    value,
    options = {}
  ) {
    if (
      options.onlyIfNew
      && this.map.has(key)
    ) {
      return {
        modified: false,
      };
    }

    this.map.set(
      key,
      JSON.parse(
        JSON.stringify(value)
      )
    );

    return {
      modified: true,
    };
  }
}


function input(
  clientRequestId,
  amount = 125000
) {
  return {
    amount,

    memberId:
      "C5A_MEMBER",

    memberCode:
      "C5A",

    bookingId:
      "",

    invoiceDraftId:
      "draft-c5a",

    paymentMethod:
      "bank_transfer",

    cashAmount: 0,

    bankTransferAmount:
      amount,

    clientRequestId,

    source:
      "c5a-smoke",
  };
}


async function main() {
  console.log(
    "=== C5A PUBLIC BACKEND SMOKE ==="
  );

  // ----------------------------------------------------------
  // Same request => exactly same PaymentIntent.
  // ----------------------------------------------------------

  const store =
    new FakeStore();

  const first =
    await reservePaymentIntent(
      store,
      input("request-001")
    );

  const second =
    await reservePaymentIntent(
      store,
      input("request-001")
    );

  assert.strictEqual(
    first.created,
    true
  );

  assert.strictEqual(
    second.created,
    false
  );

  assert.strictEqual(
    first.intent.orderCode,
    second.intent.orderCode
  );

  console.log(
    "✅ Same clientRequestId -> same orderCode"
  );

  console.log(
    "✅ Retry cannot own second provider call"
  );


  // ----------------------------------------------------------
  // Concurrency.
  // ----------------------------------------------------------

  const raceStore =
    new FakeStore();

  const results =
    await Promise.all(
      Array.from(
        {
          length: 25,
        },
        () =>
          reservePaymentIntent(
            raceStore,
            input(
              "request-race"
            )
          )
      )
    );

  const providerOwners =
    results.filter(
      (result) =>
        result.created
    );

  assert.strictEqual(
    providerOwners.length,
    1
  );

  const orderCodes =
    new Set(
      results.map(
        (result) =>
          result.intent.orderCode
      )
    );

  assert.strictEqual(
    orderCodes.size,
    1
  );

  console.log(
    "✅ 25 concurrent retries -> 1 owner"
  );

  console.log(
    "✅ Only 1 caller may contact payOS"
  );


  // ----------------------------------------------------------
  // Same request ID + different payment data is forbidden.
  // ----------------------------------------------------------

  let conflict = null;

  try {
    await reservePaymentIntent(
      store,
      input(
        "request-001",
        126000
      )
    );
  } catch (error) {
    conflict = error;
  }

  assert.ok(
    conflict
  );

  assert.strictEqual(
    conflict.code,
    "IDEMPOTENCY_CONFLICT"
  );

  assert.strictEqual(
    conflict.statusCode,
    409
  );

  console.log(
    "✅ Re-used requestId with changed amount BLOCKED"
  );


  // ----------------------------------------------------------
  // Different request ID => intentionally new PaymentIntent.
  // ----------------------------------------------------------

  const third =
    await reservePaymentIntent(
      store,
      input("request-002")
    );

  assert.notStrictEqual(
    first.intent.orderCode,
    third.intent.orderCode
  );

  console.log(
    "✅ New requestId -> new PaymentIntent"
  );


  // ----------------------------------------------------------
  // Lifecycle.
  // ----------------------------------------------------------

  assert.strictEqual(
    canTransitionPaymentStatus(
      "CREATING",
      "PENDING"
    ),
    true
  );

  assert.strictEqual(
    canTransitionPaymentStatus(
      "PENDING",
      "PAID"
    ),
    true
  );

  assert.strictEqual(
    canTransitionPaymentStatus(
      "PENDING",
      "CANCELLED"
    ),
    true
  );

  assert.strictEqual(
    canTransitionPaymentStatus(
      "PENDING",
      "EXPIRED"
    ),
    true
  );

  assert.strictEqual(
    canTransitionPaymentStatus(
      "PAID",
      "PENDING"
    ),
    false
  );

  assert.strictEqual(
    canTransitionPaymentStatus(
      "CANCELLED",
      "PAID"
    ),
    false
  );

  assert.strictEqual(
    canTransitionPaymentStatus(
      "EXPIRED",
      "PAID"
    ),
    false
  );

  console.log(
    "✅ Lifecycle transition rules PASS"
  );


  const publicPayment =
    publicPaymentIntent(
      first.intent
    );

  assert.ok(
    Object.prototype.hasOwnProperty.call(
      publicPayment,
      "cancelledAt"
    )
  );

  assert.ok(
    Object.prototype.hasOwnProperty.call(
      publicPayment,
      "expiredAt"
    )
  );

  console.log(
    "✅ Public lifecycle fields PASS"
  );


  console.log();
  console.log(
    "========================================"
  );
  console.log(
    "C5A PUBLIC BACKEND: PASS"
  );
  console.log(
    "========================================"
  );
  console.log(
    "✅ No Netlify Blob network"
  );
  console.log(
    "✅ No payOS SDK call"
  );
  console.log(
    "✅ No payment transaction"
  );
}


main().catch(
  (error) => {
    console.error(
      error
    );

    process.exitCode = 1;
  }
);
