"use strict";

const {
  getSpeakerStore,
  speakerAuthorization,
  listPendingSpeakerEvents,
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
  if (event.httpMethod !== "GET") {
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
        "[speaker-events] device auth not configured"
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

  const rawLimit =
    event
      .queryStringParameters
      ?.limit;

  const limit =
    Number(rawLimit);

  try {
    const store =
      getSpeakerStore();

    const events =
      await listPendingSpeakerEvents(
        store,
        { limit }
      );

    return json(200, {
      ok: true,
      events,
      count: events.length,
      serverTime:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[speaker-events] queue read failed",
      {
        name: String(error?.name || ""),
        message: String(error?.message || "").slice(0, 300),
      }
    );

    return json(500, {
      ok: false,
      error: "Could not read speaker queue",
    });
  }
};
