const crypto = require("crypto");
const { PayOS } = require("@payos/node");

const WEBHOOK_URL =
  "https://lanpinktattoo.com/.netlify/functions/payos-webhook";

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function safeEqual(expected, given) {
  if (!expected || !given) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const givenBuffer = Buffer.from(given);

  if (expectedBuffer.length !== givenBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    givenBuffer
  );
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return response(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  const expectedSecret =
    process.env.PAYMENT_SYNC_SECRET || "";

  const headers = event.headers || {};

  const givenSecret =
    headers["x-lanpink-secret"]
    || headers["X-Lanpink-Secret"]
    || "";

  if (!safeEqual(expectedSecret, givenSecret)) {
    return response(401, {
      ok: false,
      error: "Unauthorized",
    });
  }

  const required = [
    "PAYOS_CLIENT_ID",
    "PAYOS_API_KEY",
    "PAYOS_CHECKSUM_KEY",
  ];

  const missing = required.filter(
    (name) => !String(process.env[name] || "").trim()
  );

  if (missing.length > 0) {
    return response(500, {
      ok: false,
      error: "Missing payOS environment variables",
      missing,
    });
  }

  try {
    const payOS = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });

    const result =
      await payOS.webhooks.confirm(WEBHOOK_URL);

    const data =
      result && typeof result === "object"
        ? result
        : {};

    const nested =
      data.data && typeof data.data === "object"
        ? data.data
        : {};

    return response(200, {
      ok: true,
      registered: true,
      webhookUrl:
        data.webhookUrl
        || nested.webhookUrl
        || WEBHOOK_URL,
      channelName:
        data.name
        || nested.name
        || "",
      channelShortName:
        data.shortName
        || nested.shortName
        || "",
    });
  } catch (error) {
    console.error(
      "payOS webhook confirmation failed:",
      error
    );

    return response(502, {
      ok: false,
      error: "payOS webhook confirmation failed",
      message:
        error && error.message
          ? error.message
          : "Unknown error",
    });
  }
};
