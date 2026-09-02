"use strict";

const {
  connectLambda,
} = require("@netlify/blobs");

const {
  normalizeAccess,
  getStatus,
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

      "Access-Control-Allow-Methods":
        "GET, OPTIONS",
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
    event.httpMethod !== "GET"
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

  const access =
    normalizeAccess(
      event
        .queryStringParameters
      || {}
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

    const status =
      await getStatus(
        access
      );

    return json(
      200,
      {
        ok: true,
        ...status,
      }
    );
  } catch (error) {
    console.error(
      "[lucky-wheel-status]",
      error
    );

    return json(
      500,
      {
        ok: false,
        error:
          "Unable to load spin status",
      }
    );
  }
};
