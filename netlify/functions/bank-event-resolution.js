"use strict";

const {
  json,
  getBankEventStore,
} = require("./_lanpink-bank-feed");

const {
  getBankResolutionStore,
  bankEventStorageKeyFromId,
  writeAuthorization,
  buildIgnoredResolution,
  buildMatchedResolution,
  persistResolution,
} = require("./_lanpink-bank-resolution");

exports.handler =
async function(event) {
  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  const auth =
    writeAuthorization(event);

  if (!auth.ok) {
    if (auth.configurationError) {
      return json(500, {
        ok: false,
        error:
          "Bank feed write auth not configured",
      });
    }

    return json(401, {
      ok: false,
      error: "Unauthorized",
    });
  }

  let payload;

  try {
    payload =
      JSON.parse(
        event.body || "{}"
      );
  } catch {
    return json(400, {
      ok: false,
      error: "Invalid JSON",
    });
  }

  const bankEventId =
    String(
      payload.bankEventId || ""
    ).trim();

  const action =
    String(
      payload.action || ""
    )
      .trim()
      .toLowerCase();

  if (
    !["ignore", "match"].includes(
      action
    )
  ) {
    return json(400, {
      ok: false,
      error:
        "Unsupported resolution action",
    });
  }

  let bankKey;

  try {
    bankKey =
      bankEventStorageKeyFromId(
        bankEventId
      );
  } catch {
    return json(400, {
      ok: false,
      error: "Invalid BankEvent id",
    });
  }

  try {
    const bankStore =
      getBankEventStore();

    const bankEvent =
      await bankStore.get(
        bankKey,
        {
          type: "json",
          consistency: "strong",
        }
      );

    if (
      !bankEvent
      || bankEvent.bankEventId
        !== bankEventId
    ) {
      return json(404, {
        ok: false,
        error:
          "BankEvent not found",
      });
    }

    const resolution =
      action === "match"
        ? buildMatchedResolution(
            bankEvent,
            {
              memberId:
                String(
                  payload.memberId || ""
                ),

              invoiceCode:
                String(
                  payload.invoiceCode || ""
                ),

              note:
                String(
                  payload.note || ""
                ),
            }
          )
        : buildIgnoredResolution(
            bankEvent,
            {
              note:
                String(
                  payload.note || ""
                ),
            }
          );

    const expectedStatus =
      action === "match"
        ? "MATCHED"
        : "IGNORED";

    const resolutionStore =
      getBankResolutionStore();

    const persisted =
      await persistResolution(
        resolutionStore,
        resolution
      );

    if (
      persisted.resolution
        ?.resolutionStatus
      !== expectedStatus
    ) {
      return json(409, {
        ok: false,
        error:
          "BankEvent already resolved differently",
      });
    }

    if (
      action === "match"
      && persisted.duplicate
      && (
        String(
          persisted.resolution?.memberId
          || ""
        ) !== String(
          resolution.memberId || ""
        )
        || String(
          persisted.resolution?.invoiceCode
          || ""
        ) !== String(
          resolution.invoiceCode || ""
        )
      )
    ) {
      return json(409, {
        ok: false,
        error:
          "BankEvent already matched "
          + "to another invoice",
      });
    }

    return json(200, {
      ok: true,
      resolved: true,

      duplicateResolution:
        persisted.duplicate,

      bankEventId,

      resolutionStatus:
        expectedStatus,
    });
  } catch (error) {
    console.error(
      "[bank-resolution] failed",
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
        "Could not resolve BankEvent",
    });
  }
};
