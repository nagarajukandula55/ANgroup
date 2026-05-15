export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

/* =========================================================
   VERIFY PAYMENT API
========================================================= */

export async function POST(req: Request) {
  try {
    await connectDB();

    /* =========================================================
       ENV VALIDATION
    ========================================================= */

    if (
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      throw new Error(
        "Missing RAZORPAY_KEY_SECRET"
      );
    }

    /* =========================================================
       PARSE BODY
    ========================================================= */

    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = body;

    /* =========================================================
       VALIDATION
    ========================================================= */

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing payment verification fields",
        },
        { status: 400 }
      );
    }

    /* =========================================================
       FIND ORDER
    ========================================================= */

    const order =
      await Order.findOne({
        orderId,
      });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
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
        orderId,
      });
    }

    /* =========================================================
       VERIFY RAZORPAY ORDER ID
    ========================================================= */

    if (
      razorpay_order_id !==
      order.payment?.gatewayOrderId
    ) {
      order.events.push({
        type:
          "VERIFY_ORDER_ID_MISMATCH",

        message:
          "Razorpay order ID mismatch during verification",

        data: {
          receivedOrderId:
            razorpay_order_id,

          storedOrderId:
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
       SIGNATURE VERIFICATION
    ========================================================= */

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env
            .RAZORPAY_KEY_SECRET
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    const signatureBuffer =
      Buffer.from(
        razorpay_signature
      );

    const generatedBuffer =
      Buffer.from(
        generatedSignature
      );

    if (
      signatureBuffer.length !==
      generatedBuffer.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment signature",
        },
        { status: 400 }
      );
    }

    const isValidSignature =
      crypto.timingSafeEqual(
        signatureBuffer,
        generatedBuffer
      );

    if (!isValidSignature) {
      order.payment.status =
        "FAILED";

      order.status =
        "PAYMENT_FAILED";

      order.events.push({
        type:
          "VERIFY_SIGNATURE_FAILED",

        message:
          "Payment signature verification failed",

        data: {
          razorpay_order_id,
          razorpay_payment_id,
        },

        createdAt: new Date(),
      });

      await order.save();

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment signature",
        },
        { status: 400 }
      );
    }

    /* =========================================================
       UPDATE ORDER
    ========================================================= */

    order.payment.status =
      "SUCCESS";

    order.payment.gatewayPaymentId =
      razorpay_payment_id;

    order.payment.gatewaySignature =
      razorpay_signature;

    order.payment.paidAt =
      new Date();

    order.paymentVerified =
      true;

    order.stockReserved = true;

    order.status = "PAID";

    order.locked = true;

    /* =========================================================
       EVENTS
    ========================================================= */

    order.events.push({
      type:
        "PAYMENT_VERIFIED",

      message:
        "Payment verified successfully",

      data: {
        razorpay_order_id,
        razorpay_payment_id,
      },

      createdAt: new Date(),
    });

    /* =========================================================
       SAVE
    ========================================================= */

    await order.save();

    /* =========================================================
       RESPONSE
    ========================================================= */

    return NextResponse.json({
      success: true,
      message:
        "Payment verified successfully",
      orderId,
    });
  } catch (err: any) {
    console.error(
      "PAYMENT VERIFY ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,

        message:
          err?.message ||
          "Payment verification failed",
      },
      { status: 500 }
    );
  }
}
