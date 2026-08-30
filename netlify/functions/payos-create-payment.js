"use strict";

const {
  json,
  cleanAmount,
  cleanString,

  getPaymentStore,
  getPayOS,

  isPrivateRequestAuthorized,

  reservePaymentIntent,
  writePaymentIntent,

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

  if (event.httpMethod !== "POST") {
    return json(405, {
      ok: false,
      error: "Method not allowed",
    });
  }

  /*
   * Endpoint này dành cho Lanpink Member backend
   * gọi server-to-server.
   *
   * Browser không được tự tạo PaymentIntent.
   */
  if (!isPrivateRequestAuthorized(event)) {
    return json(401, {
      ok: false,
      error: "Unauthorized",
    });
  }

  let body = {};

  try {
    body = JSON.parse(
      event.body || "{}"
    );
  } catch {
    return json(400, {
      ok: false,
      error: "Invalid JSON",
    });
  }

  const amount =
    cleanAmount(body.amount);

  if (!amount) {
    return json(400, {
      ok: false,
      error:
        "Payment amount must be a positive integer",
    });
  }

  const bankTransferAmount =
    cleanAmount(
      body.bankTransferAmount
      ?? body.bank_transfer_amount
      ?? amount
    );

  if (
    !bankTransferAmount
    || bankTransferAmount !== amount
  ) {
    return json(400, {
      ok: false,
      error:
        "amount must equal bankTransferAmount",
    });
  }

  const store =
    getPaymentStore();

  let intent = null;

  try {
    intent =
      await reservePaymentIntent(
        store,
        {
          amount,

          memberId:
            body.memberId
            ?? body.member_id,

          memberCode:
            body.memberCode
            ?? body.member_code,

          bookingId:
            body.bookingId
            ?? body.booking_id,

          invoiceDraftId:
            body.invoiceDraftId
            ?? body.invoice_draft_id,

          paymentMethod:
            body.paymentMethod
            ?? body.payment_method,

          cashAmount:
            body.cashAmount
            ?? body.cash_amount
            ?? 0,

          bankTransferAmount,

          clientRequestId:
            body.clientRequestId
            ?? body.client_request_id,

          source:
            body.source
            || "lanpink-member",
        }
      );

    const payOS = getPayOS();

    /*
     * payOS docs note description can be limited
     * to 9 chars for some bank-link configurations.
     *
     * LP + 7 trailing digits = 9 chars.
     */
    const description =
      `LP${String(
        intent.orderCode
      ).slice(-7)}`;

    const returnUrl =
      cleanString(
        process.env.PAYOS_RETURN_URL
        || "https://lanpinktattoo.com/",
        500
      );

    const cancelUrl =
      cleanString(
        process.env.PAYOS_CANCEL_URL
        || "https://lanpinktattoo.com/",
        500
      );

    const payment =
      await payOS.paymentRequests.create({
        orderCode:
          intent.orderCode,

        amount:
          intent.amount,

        description,

        returnUrl,
        cancelUrl,
      });

    intent = {
      ...intent,

      status:
        String(
          payment.status
          || "PENDING"
        ).toUpperCase(),

      paymentLinkId:
        cleanString(
          payment.paymentLinkId,
          200
        ),

      checkoutUrl:
        cleanString(
          payment.checkoutUrl,
          600
        ),

      qrCode:
        cleanString(
          payment.qrCode,
          4000
        ),

      providerBin:
        cleanString(
          payment.bin,
          40
        ),

      providerAccountNumber:
        cleanString(
          payment.accountNumber,
          100
        ),

      providerAccountName:
        cleanString(
          payment.accountName,
          200
        ),

      providerDescription:
        cleanString(
          payment.description
          || description,
          200
        ),

      updatedAt:
        new Date().toISOString(),
    };

    await writePaymentIntent(
      store,
      intent
    );

    return json(200, {
      ok: true,
      payment:
        publicPaymentIntent(
          intent
        ),
    });
  } catch (error) {
    /*
     * Nếu đã reserve intent nhưng payOS lỗi,
     * giữ record để debug, không biến nó thành PAID.
     */
    if (intent) {
      try {
        await writePaymentIntent(
          store,
          {
            ...intent,

            status:
              "CREATE_FAILED",

            updatedAt:
              new Date().toISOString(),

            lastError:
              safeError(error),
          }
        );
      } catch {
        // Không che lỗi gốc.
      }
    }

    console.error(
      "[payos-create-payment]",
      safeError(error)
    );

    return json(
      Number(error?.statusCode) || 502,
      {
        ok: false,
        error:
          "Could not create payOS payment",
        detail:
          safeError(error),
      }
    );
  }
};
