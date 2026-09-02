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

// LANPINK_MINIGAME_STATUS_NO_CACHE_START
//
// Mini Game status is mutable state.
// Never allow browser/CDN caching here, otherwise an invoice can
// temporarily show an old remainingSpins value after a successful play.
//
const __lanpinkMiniGameStatusHandler =
  module.exports.handler;

if (
  typeof __lanpinkMiniGameStatusHandler
  !== "function"
) {
  throw new Error(
    "Mini Game status handler is not available"
  );
}

const __lanpinkMiniGameNoStoreHeaders = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control":
    "no-store",
  "Netlify-CDN-Cache-Control":
    "no-store",
  "Pragma":
    "no-cache",
  "Expires":
    "0",
};

module.exports.handler =
  async (...args) => {

    const response =
      await __lanpinkMiniGameStatusHandler(
        ...args
      );

    if (
      !response
      || typeof response !== "object"
    ) {
      return response;
    }

    const headers = {
      ...(response.headers || {}),
    };

    // Remove any pre-existing cache directives regardless of casing.
    const cacheHeaderNames =
      new Set([
        "cache-control",
        "cdn-cache-control",
        "netlify-cdn-cache-control",
        "pragma",
        "expires",
      ]);

    for (const key of Object.keys(headers)) {
      if (
        cacheHeaderNames.has(
          key.toLowerCase()
        )
      ) {
        delete headers[key];
      }
    }

    Object.assign(
      headers,
      __lanpinkMiniGameNoStoreHeaders
    );

    return {
      ...response,
      headers,
    };
  };

// LANPINK_MINIGAME_STATUS_NO_CACHE_END

