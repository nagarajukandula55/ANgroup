import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { getFinancialYear } from "@/lib/financialYear";

/* ================= CORS ================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://shopnative.in",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/* ================= OPTIONS ================= */

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/* ================= VERIFY PAYMENT ================= */

export async function POST(req: Request) {
  try {
    await connectDB();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = await req.json();

    /* ================= VALIDATION ================= */

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return NextResponse.json(
        { success: false, message: "Missing payment fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    /* ================= FIND ORDER ================= */

    const order = await Order.findOne({ orderId });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    /* ================= IDENTITY GUARD ================= */

    if (order.payment?.status === "SUCCESS") {
      return NextResponse.json(
        { success: true, message: "Already verified" },
        { headers: corsHeaders }
      );
    }

    /* ================= SIGNATURE VERIFY ================= */

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, message: "Invalid payment signature" },
        { status: 400, headers: corsHeaders }
      );
    }

    /* ================= SAFE PAYMENT INIT ================= */

    if (!order.payment) {
      order.payment = {
        method: "RAZORPAY",
        status: "INITIATED",
        amountPaid: 0,
      };
    }

    /* ================= UPDATE PAYMENT ================= */

    order.payment.status = "SUCCESS";
    order.payment.gatewayOrderId = razorpay_order_id;
    order.payment.gatewayPaymentId = razorpay_payment_id;
    order.payment.gatewaySignature = razorpay_signature;
    order.payment.amountPaid = order.amount;
    order.payment.paidAt = new Date();

    /* ================= ORDER STATE ================= */

    order.status = "PAID";
    order.paymentVerified = true;
    order.locked = true;

    /* ================= EVENTS ================= */

    order.events.push({
      type: "PAYMENT_SUCCESS",
      message: "Payment verified successfully",
      data: {
        razorpay_order_id,
        razorpay_payment_id,
      },
      createdAt: new Date(),
    });

    /* ================= INVOICE GENERATION ================= */

    if (!order.invoice?.invoiceNumber) {
      const fy = getFinancialYear();

      const invoiceType = order.gstType === "B2B" ? "B2B" : "TAX";

      const count = await Order.countDocuments({
        "invoice.invoiceType": invoiceType,
      });

      const serial = String(count + 1).padStart(6, "0");

      order.invoice = {
        invoiceType,
        invoiceNumber: `NA-${invoiceType}-${fy}-${serial}`,
        financialYear: fy,
        generatedAt: new Date(),
        pdfGenerated: false,
        locked: false,
      };

      order.invoiceGenerated = true;
    }

    /* ================= SAVE ================= */

    await order.save();

    return NextResponse.json(
      { success: true, message: "Payment verified" },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("PAYMENT VERIFY ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Verification failed",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
