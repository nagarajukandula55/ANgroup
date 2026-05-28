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

    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        "Missing RAZORPAY_KEY_SECRET"
      );
    }

    /* =========================================================
       BODY
    ========================================================= */

    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = body;

    console.log(
      "VERIFY PAYMENT BODY:",
      body
    );

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

      console.log("========== VERIFY START ==========");
      
      console.log("FRONTEND DATA:", {
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
      });
      
      const order =
        await Order.findOne({
          orderId,
        });
      
      console.log("DB ORDER:", order);
      
      if (order) {
        console.log("DB VALUES:", {
          dbOrderId: order.orderId,
          dbRazorpayOrderId:
            order.razorpayOrderId,
        });
      }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    console.log(
      "ORDER FOUND:",
      {
        orderId: order.orderId,
        storedRazorpayOrderId:
          order.razorpayOrderId,
        receivedRazorpayOrderId:
          razorpay_order_id,
      }
    );

    /* =========================================================
       ALREADY VERIFIED
    ========================================================= */

    if (
      order.paymentVerified === true
    ) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        orderId,
      });
    }

    /* =========================================================
       VERIFY ORDER ID
    ========================================================= */

      console.log("COMPARE:", {
        frontend:
          razorpay_order_id,
        database:
          order.razorpayOrderId,
      });
      
      if (
        String(razorpay_order_id).trim() !==
        String(order.razorpayOrderId).trim()
      ) {
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
       VERIFY SIGNATURE
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

    const isValidSignature =
      generatedSignature ===
      razorpay_signature;

    console.log(
      "SIGNATURE CHECK:",
      {
        generatedSignature,
        razorpay_signature,
        isValidSignature,
      }
    );

    if (!isValidSignature) {
      order.paymentStatus =
        "FAILED";

      order.orderStatus =
        "PAYMENT_FAILED";

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

    order.paymentVerified = true;

    order.paymentStatus =
      "PAID";

    order.orderStatus =
      "CONFIRMED";

    order.razorpayPaymentId =
      razorpay_payment_id;

    order.razorpaySignature =
      razorpay_signature;

    order.paidAt =
      new Date();

    await order.save();

    console.log(
      "PAYMENT VERIFIED:",
      orderId
    );

    /* =========================================================
       SUCCESS
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
      {
        status: 500,
      }
    );
  }
}
