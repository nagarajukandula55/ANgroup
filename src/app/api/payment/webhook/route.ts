export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

/* =========================================================
   WEBHOOK
========================================================= */

export async function POST(req: Request) {
  try {
    await connectDB();

    /* =========================================================
       ENV VALIDATION
    ========================================================= */

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error(
        "Missing RAZORPAY_WEBHOOK_SECRET"
      );
    }

    /* =========================================================
       RAW BODY
    ========================================================= */

    const rawBody = await req.text();

    /* =========================================================
       SIGNATURE VALIDATION
    ========================================================= */

    const razorpaySignature =
      req.headers.get(
        "x-razorpay-signature"
      ) || "";

    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env
          .RAZORPAY_WEBHOOK_SECRET
      )
      .update(rawBody)
      .digest("hex");

    const signatureBuffer =
      Buffer.from(razorpaySignature);

    const expectedBuffer =
      Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !==
      expectedBuffer.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid webhook signature",
        },
        { status: 400 }
      );
    }

    const isValidSignature =
      crypto.timingSafeEqual(
        signatureBuffer,
        expectedBuffer
      );

    if (!isValidSignature) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid webhook signature",
        },
        { status: 400 }
      );
    }

    /* =========================================================
       PARSE EVENT
    ========================================================= */

    const event = JSON.parse(rawBody);

    const eventType = event?.event;

    /* =========================================================
       PAYMENT CAPTURED
    ========================================================= */

    if (eventType === "payment.captured") {
      const payment =
        event?.payload?.payment
          ?.entity;

      /* ================= VALIDATE ================= */

      if (!payment) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid payment payload",
          },
          { status: 400 }
        );
      }

      if (
        payment.status !==
        "captured"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Payment not captured",
          },
          { status: 400 }
        );
      }

      const orderId =
        payment?.notes?.orderId;

      if (!orderId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Order ID missing",
          },
          { status: 400 }
        );
      }

      /* ================= FIND ORDER ================= */

      const order =
        await Order.findOne({
          orderId,
        });

      if (!order) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Order not found",
          },
          { status: 404 }
        );
      }

      /* =========================================================
         VERIFY RAZORPAY ORDER ID
      ========================================================= */

      if (
        payment.order_id !==
        order.payment
          ?.gatewayOrderId
      ) {
        order.events.push({
          type:
            "PAYMENT_ORDER_MISMATCH",

          message:
            "Gateway order ID mismatch",

          data: {
            razorpayOrderId:
              payment.order_id,

            dbGatewayOrderId:
              order.payment
                ?.gatewayOrderId,
          },

          createdAt: new Date(),
        });

        await order.save();

        return NextResponse.json(
          {
            success: false,
            message:
              "Gateway order mismatch",
          },
          { status: 400 }
        );
      }

      /* =========================================================
         IDEMPOTENCY CHECK
      ========================================================= */

      if (
        order.paymentVerified ||
        order.payment?.status ===
          "SUCCESS"
      ) {
        return NextResponse.json({
          success: true,
          duplicate: true,
        });
      }

      /* =========================================================
         AMOUNT VALIDATION
      ========================================================= */

      const paidAmount =
        Number(payment.amount || 0) /
        100;

      if (
        Number(order.amount) !==
        Number(paidAmount)
      ) {
        order.events.push({
          type:
            "PAYMENT_AMOUNT_MISMATCH",

          message:
            "Webhook payment amount mismatch",

          data: {
            orderAmount:
              order.amount,

            paidAmount,

            paymentId:
              payment.id,
          },

          createdAt: new Date(),
        });

        await order.save();

        return NextResponse.json(
          {
            success: false,
            message:
              "Amount mismatch",
          },
          { status: 400 }
        );
      }

      /* =========================================================
         UPDATE PAYMENT
      ========================================================= */

      order.payment.status =
        "SUCCESS";

      order.payment
        .gatewayPaymentId =
        payment.id;

      order.payment
        .gatewaySignature =
        razorpaySignature;

      order.payment.paidAt =
        payment.captured_at
          ? new Date(
              payment.captured_at *
                1000
            )
          : new Date();

      order.payment.amountPaid =
        paidAmount;

      /* =========================================================
         OPTIONAL RAW STORAGE
      ========================================================= */

      order.payment.rawWebhook =
        event;

      /* =========================================================
         ORDER STATE
      ========================================================= */

      order.paymentVerified = true;

      order.stockReserved = true;

      order.invoiceGenerated =
        false;

      order.shipmentCreated =
        false;

      order.locked = true;

      order.status = "PAID";

      /* =========================================================
         EVENTS
      ========================================================= */

      order.events.push({
        type:
          "PAYMENT_SUCCESS_WEBHOOK",

        message:
          "Payment confirmed via Razorpay webhook",

        data: {
          paymentId:
            payment.id,

          orderId,

          amount:
            paidAmount,

          method:
            payment.method,

          email:
            payment.email,

          contact:
            payment.contact,
        },

        createdAt: new Date(),
      });

      /* =========================================================
         SAVE
      ========================================================= */

      await order.save();

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================================================
       PAYMENT FAILED
    ========================================================= */

    if (eventType === "payment.failed") {
      const payment =
        event?.payload?.payment
          ?.entity;

      if (!payment) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid failed payment payload",
          },
          { status: 400 }
        );
      }

      const orderId =
        payment?.notes?.orderId;

      if (!orderId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Order ID missing",
          },
          { status: 400 }
        );
      }

      const order =
        await Order.findOne({
          orderId,
        });

      if (!order) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Order not found",
          },
          { status: 404 }
        );
      }

      order.payment.status =
        "FAILED";

      order.payment
        .gatewayPaymentId =
        payment?.id || null;

      order.payment.rawWebhook =
        event;

      order.status =
        "PAYMENT_FAILED";

      order.events.push({
        type: "PAYMENT_FAILED",

        message:
          "Payment failed via Razorpay webhook",

        data: {
          paymentId:
            payment?.id,

          reason:
            payment?.error_description ||
            payment?.error_reason ||
            "Unknown",
        },

        createdAt: new Date(),
      });

      await order.save();

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================================================
       PAYMENT AUTHORIZED
    ========================================================= */

    if (
      eventType ===
      "payment.authorized"
    ) {
      const payment =
        event?.payload?.payment
          ?.entity;

      const orderId =
        payment?.notes?.orderId;

      if (orderId) {
        const order =
          await Order.findOne({
            orderId,
          });

        if (order) {
          order.events.push({
            type:
              "PAYMENT_AUTHORIZED",

            message:
              "Payment authorized",

            data: {
              paymentId:
                payment?.id,
            },

            createdAt:
              new Date(),
          });

          await order.save();
        }
      }

      return NextResponse.json({
        success: true,
      });
    }

    /* =========================================================
       UNHANDLED EVENTS
    ========================================================= */

    return NextResponse.json({
      success: true,
      ignored: true,
      event: eventType,
    });
  } catch (err: any) {
    console.error(
      "RAZORPAY WEBHOOK ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,

        message:
          err?.message ||
          "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}
