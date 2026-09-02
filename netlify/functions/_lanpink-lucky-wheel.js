"use strict";

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const CAMPAIGN_ID =
  "womens-day-2026-10-20";

const SPIN_UNIT =
  500000;

const STORE_NAME =
  "lanpink-lucky-wheel";

const PRIZES = [
  {
    id: "giai-1",
    weight: 1,
    maxWins: 1,
  },
  {
    id: "giai-2",
    weight: 24,
  },
  {
    id: "giai-3",
    weight: 25,
  },
  {
    id: "giai-4",
    weight: 50,
  },
];

function cleanString(
  value,
  maxLength = 200
) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function getSecret() {
  return String(
    process.env
      .LANPINK_MINIGAME_SECRET
    || process.env
      .PAYMENT_SYNC_SECRET
    || ""
  ).trim();
}

function safeEqual(
  leftValue,
  rightValue
) {
  const left =
    Buffer.from(
      String(leftValue || "")
    );

  const right =
    Buffer.from(
      String(rightValue || "")
    );

  if (
    left.length !== right.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    left,
    right
  );
}

function normalizeAccess(
  input = {}
) {
  const campaign =
    cleanString(
      input.campaign,
      80
    );

  const invoice =
    cleanString(
      input.invoice,
      80
    ).toUpperCase();

  const amount =
    Number(input.amount);

  const totalSpins =
    Number(input.spins);

  const signature =
    cleanString(
      input.sig,
      200
    ).toLowerCase();

  if (
    campaign !== CAMPAIGN_ID
    || !/^LP-[A-Z0-9]+$/.test(
      invoice
    )
    || !Number.isSafeInteger(
      amount
    )
    || amount <= 0
    || !Number.isSafeInteger(
      totalSpins
    )
    || totalSpins <= 0
    || totalSpins > 100
    || totalSpins
      !== Math.floor(
        amount / SPIN_UNIT
      )
    || !/^[a-f0-9]{64}$/.test(
      signature
    )
  ) {
    return null;
  }

  const secret =
    getSecret();

  if (!secret) {
    return null;
  }

  const signedText =
    [
      campaign,
      invoice,
      amount,
      totalSpins,
    ].join("|");

  const expected =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(signedText)
      .digest("hex");

  if (
    !safeEqual(
      expected,
      signature
    )
  ) {
    return null;
  }

  return {
    campaign,
    invoice,
    amount,
    totalSpins,
  };
}

function canUseStrongConsistency() {
  const context =
    globalThis.netlifyBlobsContext;

  return Boolean(
    context
    && typeof context === "object"
    && context.uncachedEdgeURL
  );
}

function storeOptions() {
  const options = {
    name: STORE_NAME,
  };

  if (
    canUseStrongConsistency()
  ) {
    options.consistency =
      "strong";
  }

  return options;
}

function jsonReadOptions() {
  const options = {
    type: "json",
  };

  if (
    canUseStrongConsistency()
  ) {
    options.consistency =
      "strong";
  }

  return options;
}

function getGameStore() {
  return getStore(
    storeOptions()
  );
}

function invoiceHash(
  invoice
) {
  return crypto
    .createHash("sha256")
    .update(invoice)
    .digest("hex")
    .slice(0, 40);
}

function spinKey(
  access,
  spinNumber
) {
  return (
    "plays/"
    + access.campaign
    + "/"
    + invoiceHash(
        access.invoice
      )
    + "/spin-"
    + String(
        spinNumber
      ).padStart(3, "0")
    + ".json"
  );
}

function prizeQuotaKey(
  prizeId,
  slot
) {
  return (
    "prize-quota/"
    + CAMPAIGN_ID
    + "/"
    + prizeId
    + "/slot-"
    + String(slot)
      .padStart(3, "0")
    + ".json"
  );
}

async function getUsedSpins(
  store,
  access
) {
  let used = 0;

  for (
    let spin = 1;
    spin <= access.totalSpins;
    spin += 1
  ) {
    const record =
      await store.get(
        spinKey(
          access,
          spin
        ),
        jsonReadOptions()
      );

    if (record) {
      used += 1;
    }
  }

  return used;
}

async function getStatus(
  access
) {
  const store =
    getGameStore();

  const usedSpins =
    await getUsedSpins(
      store,
      access
    );

  return {
    campaign:
      access.campaign,

    invoice:
      access.invoice,

    amount:
      access.amount,

    totalSpins:
      access.totalSpins,

    usedSpins,

    remainingSpins:
      Math.max(
        0,
        access.totalSpins
        - usedSpins
      ),
  };
}

function cleanRequestId(
  value
) {
  const id =
    cleanString(
      value,
      120
    );

  if (
    !/^[a-z0-9_-]{8,120}$/i
      .test(id)
  ) {
    throw new Error(
      "Invalid clientRequestId"
    );
  }

  return id;
}

function weightedPick(
  prizes
) {
  const total =
    prizes.reduce(
      (sum, prize) =>
        sum
        + Math.max(
          0,
          Number(
            prize.weight
          ) || 0
        ),
      0
    );

  if (total <= 0) {
    throw new Error(
      "Invalid prize pool"
    );
  }

  let cursor =
    crypto.randomInt(total);

  for (
    const prize
    of prizes
  ) {
    const weight =
      Math.max(
        0,
        Number(
          prize.weight
        ) || 0
      );

    if (
      cursor < weight
    ) {
      return prize;
    }

    cursor -= weight;
  }

  return prizes[
    prizes.length - 1
  ];
}

async function findOwnedLimitedPrize(
  store,
  ownerPlayKey
) {
  for (
    const prize
    of PRIZES
  ) {
    const maxWins =
      Number(
        prize.maxWins
      ) || 0;

    if (maxWins <= 0) {
      continue;
    }

    for (
      let slot = 1;
      slot <= maxWins;
      slot += 1
    ) {
      const record =
        await store.get(
          prizeQuotaKey(
            prize.id,
            slot
          ),
          jsonReadOptions()
        );

      if (
        record?.ownerPlayKey
        === ownerPlayKey
      ) {
        return prize;
      }
    }
  }

  return null;
}

async function claimLimitedPrize(
  store,
  prize,
  ownerPlayKey
) {
  const maxWins =
    Number(
      prize.maxWins
    ) || 0;

  if (maxWins <= 0) {
    return true;
  }

  for (
    let slot = 1;
    slot <= maxWins;
    slot += 1
  ) {
    const key =
      prizeQuotaKey(
        prize.id,
        slot
      );

    const record = {
      campaign:
        CAMPAIGN_ID,

      prizeId:
        prize.id,

      ownerPlayKey,

      claimedAt:
        new Date()
          .toISOString(),
    };

    const created =
      await store.setJSON(
        key,
        record,
        {
          onlyIfNew: true,
        }
      );

    if (created?.modified) {
      return true;
    }

    const canonical =
      await store.get(
        key,
        jsonReadOptions()
      );

    if (
      canonical?.ownerPlayKey
      === ownerPlayKey
    ) {
      return true;
    }
  }

  return false;
}

async function choosePrize(
  store,
  ownerPlayKey
) {
  const owned =
    await findOwnedLimitedPrize(
      store,
      ownerPlayKey
    );

  if (owned) {
    return owned;
  }

  let available =
    PRIZES.map(
      prize => ({
        ...prize
      })
    );

  while (
    available.length
  ) {
    const prize =
      weightedPick(
        available
      );

    const claimed =
      await claimLimitedPrize(
        store,
        prize,
        ownerPlayKey
      );

    if (claimed) {
      return prize;
    }

    available =
      available.filter(
        item =>
          item.id
          !== prize.id
      );
  }

  throw new Error(
    "No prize available"
  );
}

async function findRequest(
  store,
  access,
  requestId
) {
  for (
    let spin = 1;
    spin <= access.totalSpins;
    spin += 1
  ) {
    const key =
      spinKey(
        access,
        spin
      );

    const record =
      await store.get(
        key,
        jsonReadOptions()
      );

    if (
      record?.clientRequestId
      === requestId
    ) {
      return {
        key,
        record,
      };
    }
  }

  return null;
}

async function finishPlay(
  store,
  access,
  key,
  record
) {
  if (
    record.status === "COMPLETE"
    && record.prizeId
  ) {
    return record;
  }

  const prize =
    await choosePrize(
      store,
      key
    );

  const complete = {
    ...record,

    status:
      "COMPLETE",

    prizeId:
      prize.id,

    completedAt:
      new Date()
        .toISOString(),
  };

  await store.setJSON(
    key,
    complete
  );

  return complete;
}

async function claimSpin(
  access,
  clientRequestId
) {
  const requestId =
    cleanRequestId(
      clientRequestId
    );

  const store =
    getGameStore();

  const existing =
    await findRequest(
      store,
      access,
      requestId
    );

  if (existing) {
    const play =
      await finishPlay(
        store,
        access,
        existing.key,
        existing.record
      );

    return {
      ok: true,
      duplicate: true,
      play,
      status:
        await getStatus(
          access
        ),
    };
  }

  for (
    let spin = 1;
    spin <= access.totalSpins;
    spin += 1
  ) {
    const key =
      spinKey(
        access,
        spin
      );

    const pending = {
      campaign:
        access.campaign,

      invoice:
        access.invoice,

      amount:
        access.amount,

      spinNumber:
        spin,

      clientRequestId:
        requestId,

      status:
        "PENDING",

      createdAt:
        new Date()
          .toISOString(),
    };

    const created =
      await store.setJSON(
        key,
        pending,
        {
          onlyIfNew: true,
        }
      );

    if (
      !created?.modified
    ) {
      continue;
    }

    const play =
      await finishPlay(
        store,
        access,
        key,
        pending
      );

    return {
      ok: true,
      duplicate: false,
      play,
      status:
        await getStatus(
          access
        ),
    };
  }

  return {
    ok: false,
    reason:
      "no_spins_remaining",

    status:
      await getStatus(
        access
      ),
  };
}

module.exports = {
  CAMPAIGN_ID,
  SPIN_UNIT,
  normalizeAccess,
  getStatus,
  claimSpin,
};
