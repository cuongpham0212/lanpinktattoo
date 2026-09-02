"use strict";

const {
  connectLambda,
} = require("@netlify/blobs");

const {
  normalizeAccess,
  claimSpin,
} = require(
  "./_lanpink-lucky-wheel"
);

function json(
  statusCode,
  body
) {
  return {
    statusCode,

    headers: {
      "Content-Type":
        "application/json; charset=utf-8",

      "Cache-Control":
        "no-store",

      "Access-Control-Allow-Origin":
        "*",

      "Access-Control-Allow-Headers":
        "Content-Type",

      "Access-Control-Allow-Methods":
        "POST, OPTIONS",
    },

    body:
      JSON.stringify(body),
  };
}

exports.handler =
async function(event) {
  if (
    event.httpMethod === "OPTIONS"
  ) {
    return json(
      200,
      {
        ok: true
      }
    );
  }

  if (
    event.httpMethod !== "POST"
  ) {
    return json(
      405,
      {
        ok: false,
        error:
          "Method not allowed",
      }
    );
  }

  let body = {};

  try {
    body =
      JSON.parse(
        event.body || "{}"
      );
  } catch {
    return json(
      400,
      {
        ok: false,
        error:
          "Invalid JSON",
      }
    );
  }

  const access =
    normalizeAccess(
      body
    );

  if (!access) {
    return json(
      403,
      {
        ok: false,
        error:
          "Invalid Mini Game access",
      }
    );
  }

  try {
    connectLambda(event);

    const result =
      await claimSpin(
        access,
        body.clientRequestId
      );

    if (!result.ok) {
      return json(
        409,
        {
          ok: false,
          reason:
            result.reason,

          ...result.status,
        }
      );
    }

    return json(
      200,
      {
        ok: true,

        duplicate:
          result.duplicate,

        prizeId:
          result.play.prizeId,

        spinNumber:
          result.play.spinNumber,

        ...result.status,
      }
    );
  } catch (error) {
    console.error(
      "[lucky-wheel-play]",
      error
    );

    return json(
      500,
      {
        ok: false,
        error:
          "Unable to process spin",
      }
    );
  }
};
