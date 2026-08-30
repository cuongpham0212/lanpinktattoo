"use strict";

const {
  json,
  normalizeOrderCode,

  getPaymentStore,
  isPrivateRequestAuthorized,

  loadPaymentIntent,
  publicPaymentIntent,
  safeError,
} = require("./_lanpink-payos");

exports.handler =
async function(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, {
      ok: true,
    });
  }

  if (event.httpMethod !== "GET") {
    return json(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  /*
   * Lanpink Member Flask poll server-to-server.
   * Không để browser tự quyết định trạng thái PAID.
   */
  if (!isPrivateRequestAuthorized(event)) {
    return json(401, {
      ok: false,
      error: "Unauthorized",
    });
  }

  const orderCode =
    normalizeOrderCode(
      event
        .queryStringParameters
        ?.orderCode
      ?? event
        .queryStringParameters
        ?.order_code
    );

  if (!orderCode) {
    return json(400, {
      ok: false,
      error: "Invalid orderCode",
    });
  }

  try {
    const store =
      getPaymentStore();

    const intent =
      await loadPaymentIntent(
        store,
        orderCode
      );

    if (!intent) {
      return json(404, {
        ok: false,
        error:
          "PaymentIntent not found",
      });
    }

    return json(200, {
      ok: true,

      payment:
        publicPaymentIntent(
          intent
        ),
    });
  } catch (error) {
    console.error(
      "[payos-payment-status]",
      safeError(error)
    );

    return json(500, {
      ok: false,
      error:
        "Could not read PaymentIntent",
    });
  }
};
