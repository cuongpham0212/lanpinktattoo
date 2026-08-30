"use strict";

const assert =
  require("assert");

const {
  amountToVietnamese,
  buildSpeakerEvent,
  ensureSpeakerEvent,
  speakerAuthorization,
  listPendingSpeakerEvents,
  acknowledgeSpeakerEvent,
} = require(
  "../netlify/functions/_lanpink-speaker"
);

class FakeSpeakerStore {
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
      "Speaker writes must use onlyIfNew"
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

  async get(
    key,
    options = {}
  ) {
    if (
      options.type
      && options.type !== "json"
    ) {
      throw new Error(
        "Fake store only supports json"
      );
    }

    if (!this.data.has(key)) {
      return null;
    }

    return JSON.parse(
      JSON.stringify(
        this.data.get(key)
      )
    );
  }

  async list(
    options = {}
  ) {
    const prefix =
      String(
        options.prefix || ""
      );

    const blobs =
      [...this.data.keys()]
        .filter(
          (key) =>
            key.startsWith(
              prefix
            )
        )
        .map(
          (key) => ({
            key,
            etag:
              '"synthetic-etag"',
          })
        );

    return {
      blobs,
      directories: [],
    };
  }
}

(async () => {
  assert.strictEqual(
    amountToVietnamese(
      500000
    ),
    "năm trăm nghìn"
  );

  assert.strictEqual(
    amountToVietnamese(
      1250000
    ),
    "một triệu hai trăm năm mươi nghìn"
  );

  assert.strictEqual(
    amountToVietnamese(
      1005000
    ),
    "một triệu không trăm lẻ năm nghìn"
  );

  const bankEvent = {
    bankEventId:
      "bankevt_sepay_28974",

    provider:
      "sepay",

    externalTransactionId:
      "28974",

    direction:
      "IN",

    amount:
      500000,

    verificationStatus:
      "VERIFIED",

    receivedAt:
      "2026-08-31T03:32:27.000+07:00",
  };

  const event =
    buildSpeakerEvent(
      bankEvent,
      {
        createdAt:
          "2026-08-31T03:40:00.000+07:00",
      }
    );

  assert.strictEqual(
    event.speakerEventId,
    "spkevt_bankevt_sepay_28974"
  );

  assert.strictEqual(
    event.bankEventId,
    "bankevt_sepay_28974"
  );

  assert.strictEqual(
    event.eventType,
    "money.received"
  );

  assert.strictEqual(
    event.amount,
    500000
  );

  assert.strictEqual(
    event.spokenText,
    "Lan Pink đã nhận năm trăm nghìn đồng."
  );

  assert.strictEqual(
    event.status,
    "PENDING"
  );

  const store =
    new FakeSpeakerStore();

  const first =
    await ensureSpeakerEvent(
      store,
      bankEvent,
      {
        createdAt:
          "2026-08-31T03:40:00.000+07:00",
      }
    );

  const second =
    await ensureSpeakerEvent(
      store,
      bankEvent,
      {
        createdAt:
          "2026-08-31T03:41:00.000+07:00",
      }
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

  let pending =
    await listPendingSpeakerEvents(
      store,
      { limit: 20 }
    );

  assert.strictEqual(
    pending.length,
    1
  );

  assert.strictEqual(
    pending[0].speakerEventId,
    "spkevt_bankevt_sepay_28974"
  );

  const firstAck =
    await acknowledgeSpeakerEvent(
      store,
      {
        speakerEventId:
          "spkevt_bankevt_sepay_28974",

        deviceId:
          "android-test-01",
      },
      {
        acknowledgedAt:
          "2026-08-31T03:42:00.000+07:00",
      }
    );

  assert.strictEqual(
    firstAck.ok,
    true
  );

  assert.strictEqual(
    firstAck.created,
    true
  );

  assert.strictEqual(
    firstAck.duplicate,
    false
  );

  const secondAck =
    await acknowledgeSpeakerEvent(
      store,
      {
        speakerEventId:
          "spkevt_bankevt_sepay_28974",

        deviceId:
          "android-test-01",
      }
    );

  assert.strictEqual(
    secondAck.ok,
    true
  );

  assert.strictEqual(
    secondAck.created,
    false
  );

  assert.strictEqual(
    secondAck.duplicate,
    true
  );

  assert.strictEqual(
    secondAck.ack.acknowledgedAt,
    "2026-08-31T03:42:00.000+07:00",
    "duplicate ACK must preserve original acknowledgedAt"
  );

  pending =
    await listPendingSpeakerEvents(
      store,
      { limit: 20 }
    );

  assert.strictEqual(
    pending.length,
    0,
    "ACKED event must disappear from pending queue"
  );

  const goodAuth =
    speakerAuthorization(
      {
        headers: {
          authorization:
            "Bearer synthetic-device-token",
        },
      },
      {
        token:
          "synthetic-device-token",
      }
    );

  assert.strictEqual(
    goodAuth.ok,
    true
  );

  const badAuth =
    speakerAuthorization(
      {
        headers: {
          authorization:
            "Bearer wrong-token",
        },
      },
      {
        token:
          "synthetic-device-token",
      }
    );

  assert.strictEqual(
    badAuth.ok,
    false
  );

  console.log(
    "S2 SPEAKER CORE: PASS"
  );

  console.log(
    "- deterministic SpeakerEvent: PASS"
  );

  console.log(
    "- Vietnamese spoken text: PASS"
  );

  console.log(
    "- atomic SpeakerEvent dedupe: PASS"
  );

  console.log(
    "- pending queue: PASS"
  );

  console.log(
    "- ACK idempotency: PASS"
  );

  console.log(
    "- ACK removes event from pending: PASS"
  );

  console.log(
    "- device auth helper: PASS"
  );
})().catch(
  (error) => {
    console.error(
      "S2 SPEAKER CORE: FAIL",
      error
    );

    process.exit(1);
  }
);
