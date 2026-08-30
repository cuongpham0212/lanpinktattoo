"use strict";

const {
  json,
  cleanString,
  cleanAmount,
  normalizeOrderCode,
  normalizePaymentStatus,

  getPaymentStore,
  getPayOS,

  loadPaymentIntent,
  writePaymentIntent,

  safeError,
} = require("./_lanpink-payos");

exports.handler =
async function(event) {
  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  let payload = {};

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

  let verified = null;

  try {
    /*
     * CHỈ dữ liệu qua verify() mới được dùng
     * để thay đổi trạng thái payment.
     */
    const payOS = getPayOS();

    verified =
      await payOS.webhooks.verify(
        payload
      );
  } catch (error) {
    console.error(
      "[payos-webhook] invalid signature",
      safeError(error)
    );

    return json(400, {
      ok: false,
      error: "Invalid webhook",
    });
  }

  const orderCode =
    normalizeOrderCode(
      verified?.orderCode
      ?? verified?.order_code
    );

  const amount =
    cleanAmount(
      verified?.amount
    );

  /*
   * payOS dùng chính webhook URL này để gửi
   * payload mẫu khi confirm webhook.
   *
   * Signature hợp lệ nhưng orderCode mẫu
   * không tồn tại trong Lanpink là bình thường.
   * Vẫn phải trả 2xx.
   */
  if (!orderCode || !amount) {
    return json(200, {
      ok: true,
      ignored: true,
      reason:
        "verified_payload_without_payment_identity",
    });
  }

  const store =
    getPaymentStore();

  let intent = null;

  try {
    intent =
      await loadPaymentIntent(
        store,
        orderCode
      );
  } catch (error) {
    console.error(
      "[payos-webhook] blob read",
      safeError(error)
    );

    return json(500, {
      ok: false,
      error:
        "Payment store unavailable",
    });
  }

  if (!intent) {
    /*
     * Có thể là webhook sample của payOS
     * khi confirm URL.
     *
     * Đã verify signature nên acknowledge,
     * nhưng tuyệt đối không tạo PAID record.
     */
    console.log(
      "[payos-webhook] verified unknown order",
      orderCode
    );

    return json(200, {
      ok: true,
      ignored: true,
      reason:
        "unknown_order_code",
    });
  }

  if (
    Number(intent.amount)
    !== amount
  ) {
    console.error(
      "[payos-webhook] amount mismatch",
      {
        orderCode,
        expected:
          intent.amount,
        received:
          amount,
      }
    );

    await writePaymentIntent(
      store,
      {
        ...intent,

        updatedAt:
          new Date().toISOString(),

        lastWebhookIssue: {
          type:
            "AMOUNT_MISMATCH",

          receivedAmount:
            amount,

          receivedAt:
            new Date().toISOString(),
        },
      }
    );

    /*
     * Signature hợp lệ nhưng dữ liệu không khớp:
     * KHÔNG PAID, KHÔNG phát event.
     */
    return json(200, {
      ok: true,
      accepted: false,
      reason:
        "amount_mismatch",
    });
  }

  const incomingPaymentLinkId =
    cleanString(
      verified?.paymentLinkId
      ?? verified?.payment_link_id,
      200
    );

  if (
    intent.paymentLinkId
    && incomingPaymentLinkId
    && intent.paymentLinkId
      !== incomingPaymentLinkId
  ) {
    console.error(
      "[payos-webhook] paymentLinkId mismatch",
      {
        orderCode,
      }
    );

    return json(200, {
      ok: true,
      accepted: false,
      reason:
        "payment_link_mismatch",
    });
  }

  /*
   * WEBHOOK LIFECYCLE IDEMPOTENCY
   */
  const currentStatus =
    normalizePaymentStatus(
      intent.status,
      "PENDING"
    );

  if (currentStatus === "PAID") {
    return json(200, {
      ok: true,
      duplicate: true,
      orderCode,
    });
  }

  /*
   * A provider-confirmed closed QR must not later
   * mutate into PAID through a stale webhook.
   */
  if (
    currentStatus === "CANCELLED"
    || currentStatus === "EXPIRED"
  ) {
    return json(200, {
      ok: true,
      accepted: false,
      reason:
        "payment_already_closed",
      status:
        currentStatus,
      orderCode,
    });
  }

  const providerCode =
    cleanString(
      verified?.code,
      40
    );

  if (
    providerCode
    && providerCode !== "00"
  ) {
    return json(200, {
      ok: true,
      accepted: false,
      reason:
        "provider_not_success",
    });
  }

  const paidAt =
    new Date().toISOString();

  const updated = {
    ...intent,

    /*
     * Đây là DUY NHẤT nơi Phase A
     * chuyển PaymentIntent sang PAID:
     *
     * 1. webhook signature đã verify
     * 2. orderCode tồn tại
     * 3. amount khớp
     * 4. paymentLinkId khớp nếu có
     */
    status:
      "PAID",

    paidAt,
    updatedAt:
      paidAt,

    providerReference:
      cleanString(
        verified?.reference,
        200
      ),

    providerTransactionDateTime:
      cleanString(
        verified
          ?.transactionDateTime
        ?? verified
          ?.transaction_date_time,
        120
      ),

    providerWebhookCode:
      providerCode || "00",
  };

  try {
    await writePaymentIntent(
      store,
      updated
    );
  } catch (error) {
    console.error(
      "[payos-webhook] blob write",
      safeError(error)
    );

    return json(500, {
      ok: false,
      error:
        "Could not persist PAID",
    });
  }

  console.log(
    "[payos-webhook] PAID",
    {
      orderCode,
      amount,
    }
  );

  return json(200, {
    ok: true,
    paid: true,
    orderCode,
  });
};
