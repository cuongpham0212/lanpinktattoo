"use strict";

const {
  getSpeakerStore,
  speakerAuthorization,
  acknowledgeSpeakerEvent,
} = require("./_lanpink-speaker");

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

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  const auth =
    speakerAuthorization(event);

  if (!auth.ok) {
    if (auth.configurationError) {
      console.error(
        "[speaker-ack] device auth not configured"
      );

      return json(500, {
        ok: false,
        error: "Speaker device auth not configured",
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

  try {
    const store =
      getSpeakerStore();

    const result =
      await acknowledgeSpeakerEvent(
        store,
        payload
      );

    if (result.notFound) {
      return json(404, {
        ok: false,
        error: "SpeakerEvent not found",
      });
    }

    if (!result.ok) {
      return json(400, {
        ok: false,
        error: result.reason,
      });
    }

    return json(200, {
      ok: true,
      acknowledged: true,
      duplicateAck:
        result.duplicate,
      speakerEventId:
        result.ack
          .speakerEventId,
      acknowledgedAt:
        result.ack
          .acknowledgedAt,
    });
  } catch (error) {
    console.error(
      "[speaker-ack] ack failed",
      {
        name: String(error?.name || ""),
        message: String(error?.message || "").slice(0, 300),
      }
    );

    return json(500, {
      ok: false,
      error: "Could not acknowledge SpeakerEvent",
    });
  }
};
