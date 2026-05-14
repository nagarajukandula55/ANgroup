import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

import { getFinancialYear }
from "@/lib/financialYear";

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

    if (
      order.payment?.status ===
      "SUCCESS"
    ) {
      return NextResponse.json(
        {
          success: true,
          message:
            "Payment already verified",
        },
        {
          headers: corsHeaders,
        }
      );
    }

    /* ================= UPDATE ================= */

    if (!order.payment) {
      order.payment = {
        status: "INITIATED",
      };
    }
    
    order.payment.status =
      "SUCCESS";

    order.payment.gatewayOrderId =
      razorpay_order_id;
    
    order.payment.gatewayPaymentId =
      razorpay_payment_id;
    
    order.payment.gatewaySignature =
      razorpay_signature;

    order.status = "PAID";

    order.locked = true;

    order.paymentVerified = true;

    order.payment.paidAt = new Date();

    order.payment.amountPaid = order.amount;

    order.events.push({
      type: "PAYMENT_SUCCESS",
    
      message:
        "Payment verified successfully",
    
      data: {
        razorpay_order_id,
        razorpay_payment_id,
      },
    
      createdAt: new Date(),
    });

/* ================= INVOICE ================= */

  if (!order.invoice?.invoiceNumber) {
  
    const fy = getFinancialYear();
  
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
  
    if (!order.invoice) {
      order.invoice = {};
    }
  
    order.invoice.invoiceType =
      invoiceType;
  
    order.invoice.invoiceNumber =
      `NA-${invoiceType}-${fy}-${serial}`;
  
    order.invoice.financialYear =
      fy;
  
    order.invoice.generatedAt =
      new Date();

    order.invoiceGenerated = true;
  
    order.invoice.pdfGenerated =
      false;
  
    order.invoice.locked =
      false;
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
