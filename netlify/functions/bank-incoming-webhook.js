"use strict";

const {
  json,

  verifySePayWebhook,
  normalizeSePayIncoming,

  getBankEventStore,
  persistBankEvent,

  safeError,
} = require("./_lanpink-bank-feed");

const {
  getSpeakerStore,
  ensureSpeakerEvent,
} = require("./_lanpink-speaker");

exports.handler =
async function(event) {
  if (event.httpMethod !== "POST") {
    return json(405, {
      success: false,
      error: "Method not allowed",
    });
  }

  const verification =
    verifySePayWebhook(event);

  if (!verification.ok) {
    if (
      verification.configurationError
    ) {
      console.error(
        "[bank-webhook] configuration error",
        verification.reason
      );

      return json(500, {
        success: false,
        error:
          "Webhook not configured",
      });
    }

    console.warn(
      "[bank-webhook] rejected",
      verification.reason
    );

    return json(401, {
      success: false,
      error:
        "Invalid webhook authentication",
    });
  }

  let payload;

  try {
    payload =
      JSON.parse(
        verification
          .rawBody
          .toString("utf8")
      );
  } catch {
    return json(400, {
      success: false,
      error: "Invalid JSON",
    });
  }

  const normalized =
    normalizeSePayIncoming(
      payload,
      {
        rawHash:
          verification.rawHash,

        receivedAt:
          new Date().toISOString(),
      }
    );

  if (
    normalized.ok
    && normalized.ignored
  ) {
    return json(200, {
      success: true,
      ignored: true,
      reason:
        normalized.reason,
    });
  }

  if (!normalized.ok) {
    console.warn(
      "[bank-webhook] invalid verified payload",
      normalized.reason
    );

    return json(400, {
      success: false,
      error:
        "Invalid bank transaction payload",
      reason:
        normalized.reason,
    });
  }

  const bankEvent =
    normalized.bankEvent;

  try {
    const bankStore =
      getBankEventStore();

    const persisted =
      await persistBankEvent(
        bankStore,
        bankEvent
      );

    let canonicalBankEvent =
      bankEvent;

    if (persisted.duplicate) {
      canonicalBankEvent =
        await bankStore.get(
          persisted.key,
          {
            type: "json",
            consistency:
              "strong",
          }
        );

      if (!canonicalBankEvent) {
        throw new Error(
          "Canonical BankEvent unavailable"
        );
      }
    }

    const speakerStore =
      getSpeakerStore();

    const speakerPersisted =
      await ensureSpeakerEvent(
        speakerStore,
        canonicalBankEvent
      );

    if (persisted.duplicate) {
      console.log(
        "[bank-webhook] duplicate",
        {
          bankEventId:
            canonicalBankEvent
              .bankEventId,

          speakerEventId:
            speakerPersisted
              .speakerEvent
              .speakerEventId,

          speakerEventCreated:
            speakerPersisted
              .created,
        }
      );

      return json(200, {
        success: true,
        accepted: true,
        duplicate: true,

        bankEventId:
          canonicalBankEvent
            .bankEventId,

        speakerEventId:
          speakerPersisted
            .speakerEvent
            .speakerEventId,

        speakerEventCreated:
          speakerPersisted
            .created,

        speakerEventDuplicate:
          speakerPersisted
            .duplicate,
      });
    }

    console.log(
      "[bank-webhook] incoming accepted",
      {
        bankEventId:
          canonicalBankEvent
            .bankEventId,

        externalTransactionId:
          canonicalBankEvent
            .externalTransactionId,

        amount:
          canonicalBankEvent
            .amount,

        gateway:
          canonicalBankEvent
            .bankGateway,

        speakerEventId:
          speakerPersisted
            .speakerEvent
            .speakerEventId,
      }
    );

    return json(200, {
      success: true,
      accepted: true,
      duplicate: false,

      bankEventId:
        canonicalBankEvent
          .bankEventId,

      speakerEventId:
        speakerPersisted
          .speakerEvent
          .speakerEventId,

      speakerEventCreated:
        speakerPersisted
          .created,

      speakerEventDuplicate:
        speakerPersisted
          .duplicate,
    });
  } catch (error) {
    console.error(
      "[bank-webhook] persistence failure",
      safeError(error)
    );

    return json(500, {
      success: false,
      error:
        "Could not persist incoming event",
    });
  }
};
