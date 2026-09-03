"use strict";

const {
  connectLambda,
} = require(
  "@netlify/blobs"
);

const {
  CAMPAIGN_ID,
  getPublicHistory,
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
        "no-store, no-cache, must-revalidate, max-age=0",

      "CDN-Cache-Control":
        "no-store",

      "Netlify-CDN-Cache-Control":
        "no-store",

      "Pragma":
        "no-cache",

      "Expires":
        "0",

      "Access-Control-Allow-Origin":
        "*",

      "Access-Control-Allow-Methods":
        "GET, OPTIONS",
    },

    body:
      JSON.stringify(
        body
      ),
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
        ok: true,
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

  try {
    connectLambda(event);

    const rawLimit =
      Number(
        event
          .queryStringParameters
          ?.limit
      );

    const limit =
      Number.isFinite(
        rawLimit
      )
        ? rawLimit
        : 200;

    const items =
      await getPublicHistory(
        limit
      );

    return json(
      200,
      {
        ok: true,

        campaign:
          CAMPAIGN_ID,

        count:
          items.length,

        items,
      }
    );
  } catch (error) {
    console.error(
      "[lucky-wheel-history]",
      error
    );

    return json(
      500,
      {
        ok: false,
        error:
          "Unable to load history",
      }
    );
  }
};
