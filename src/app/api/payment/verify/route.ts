import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

/* ================= CORS ================= */

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://shopnative.in",

  "Access-Control-Allow-Methods":
    "POST, OPTIONS",

  "Access-Control-Allow-Headers":
    "Content-Type, Authorization",
};

/* ================= OPTIONS ================= */

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: corsHeaders,
    }
  );
}

/* ================= VERIFY ================= */

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = body;

    /* ================= VALIDATION ================= */

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
            "Missing payment fields",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    /* ================= SIGNATURE ================= */

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env
            .RAZORPAY_KEY_SECRET!
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    /* ================= VERIFY ================= */

    if (
      generatedSignature !==
      razorpay_signature
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment signature",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
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
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    /* ================= UPDATE ================= */

    order.payment.status =
      "SUCCESS";

    order.payment.razorpayOrderId =
      razorpay_order_id;

    order.payment.razorpayPaymentId =
      razorpay_payment_id;

    order.status = "PAID";

    order.events.push({
      type: "PAYMENT_SUCCESS",

      data: {
        razorpay_order_id,
        razorpay_payment_id,
      },

      createdAt: new Date(),
    });

    /* ================= INVOICE ================= */

    if (!order.invoice?.invoiceNumber) {
      const fy = "2526";

      const invoiceType =
        order.gstType === "B2B"
          ? "B2B"
          : "TAX";

      const count =
        await Order.countDocuments({
          "invoice.invoiceType":
            invoiceType,
        });

      const serial = String(
        count + 1
      ).padStart(6, "0");

      order.invoice = {
        invoiceType,

        invoiceNumber:
          `NA-${invoiceType}-${fy}-${serial}`,

        generatedAt:
          new Date(),
      };
    }

    await order.save();

    /* ================= RESPONSE ================= */

    return NextResponse.json(
      {
        success: true,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    console.error(
      "PAYMENT VERIFY ERROR",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          err.message ||
          "Verification failed",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
