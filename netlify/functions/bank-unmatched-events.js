"use strict";

const crypto = require("crypto");

const {
  getHeader,
  getBankEventStore,
} = require("./_lanpink-bank-feed");

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

function safeEqual(left, right) {
  const a = Buffer.from(
    String(left || ""),
    "utf8"
  );

  const b = Buffer.from(
    String(right || ""),
    "utf8"
  );

  return (
    a.length === b.length
    && a.length > 0
    && crypto.timingSafeEqual(a, b)
  );
}

function authorize(event) {
  const expected =
    String(
      process.env
        .LANPINK_BANK_FEED_READ_SECRET
      || ""
    ).trim();

  if (!expected) {
    return {
      ok: false,
      configurationError: true,
    };
  }

  const provided =
    String(
      getHeader(
        event,
        "x-lanpink-secret"
      )
      || ""
    ).trim();

  return {
    ok: safeEqual(
      provided,
      expected
    ),
    configurationError: false,
  };
}

function publicBankEvent(event) {
  return {
    bankEventId:
      String(
        event.bankEventId || ""
      ),

    amount:
      Number(
        event.amount || 0
      ),

    transactionTime:
      String(
        event.transactionTime || ""
      ),

    receivedAt:
      String(
        event.receivedAt || ""
      ),

    description:
      String(
        event.description || ""
      ),

    transferContent:
      String(
        event.transferContent || ""
      ),

    bankGateway:
      String(
        event.bankGateway || ""
      ),

    accountRef:
      String(
        event.accountRef || ""
      ),

    verificationStatus:
      String(
        event.verificationStatus || ""
      ),

    matchStatus:
      String(
        event.matchStatus || ""
      ),
  };
}

function sortTime(event) {
  const value =
    event.transactionTime
    || event.receivedAt
    || "";

  const timestamp =
    Date.parse(value);

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

exports.handler =
async function(event) {
  if (event.httpMethod !== "GET") {
    return json(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  const auth =
    authorize(event);

  if (!auth.ok) {
    if (auth.configurationError) {
      console.error(
        "[bank-unmatched] read auth not configured"
      );

      return json(500, {
        ok: false,
        error:
          "Bank feed read auth not configured",
      });
    }

    return json(401, {
      ok: false,
      error: "Unauthorized",
    });
  }

  const rawLimit =
    Number(
      event
        .queryStringParameters
        ?.limit
    );

  const limit =
    Number.isInteger(rawLimit)
    && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 20;

  try {
    const store =
      getBankEventStore();

    const listed =
      await store.list({
        prefix:
          "bank-events/",
      });

    const events = [];

    for (
      const blob
      of listed.blobs || []
    ) {
      const bankEvent =
        await store.get(
          blob.key,
          {
            type: "json",
            consistency:
              "strong",
          }
        );

      if (
        !bankEvent
        || bankEvent.direction !== "IN"
        || bankEvent.verificationStatus
          !== "VERIFIED"
        || bankEvent.matchStatus
          !== "UNMATCHED"
      ) {
        continue;
      }

      events.push(
        publicBankEvent(
          bankEvent
        )
      );
    }

    events.sort(
      (a, b) =>
        sortTime(b)
        - sortTime(a)
    );

    const visible =
      events.slice(
        0,
        limit
      );

    return json(200, {
      ok: true,
      events: visible,
      count: visible.length,
      serverTime:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[bank-unmatched] read failed",
      {
        name:
          String(
            error?.name || ""
          ),
        message:
          String(
            error?.message || ""
          ).slice(0, 300),
      }
    );

    return json(500, {
      ok: false,
      error:
        "Could not read unmatched bank events",
    });
  }
};
