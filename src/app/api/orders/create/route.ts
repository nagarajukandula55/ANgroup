import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import crypto from "crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://shopnative.in",

  "Access-Control-Allow-Methods":
    "POST, OPTIONS",

  "Access-Control-Allow-Headers":
    "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: corsHeaders,
    }
  );
}

/* ================= ORDER NUMBER ================= */

function generateOrderId() {
  const ts = Date.now();

  const rand = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();

  return `ORD-${ts}-${rand}`;
}

/* ================= INVOICE NUMBER ================= */

function generateInvoicePrefix(
  invoiceType = "B2C"
) {
  const year = new Date();

  const fy =
    String(year.getFullYear()).slice(2) +
    String(
      year.getFullYear() + 1
    ).slice(2);

  return `NA-${invoiceType}-${fy}`;
}

export async function POST(
  req: Request
) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      source = "NATIVE",

      customerType = "INDIVIDUAL",

      cart,

      address,

      amount,

      billing,

      paymentMethod,

      coupon,

      discount = 0,

      taxItems = [],

      gstType = "B2C",

      gstMode = "CGST_SGST",
    } = body;

    /* ================= VALIDATION ================= */

    if (
      !cart ||
      !Array.isArray(cart) ||
      !cart.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Cart empty",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (
      !address?.name ||
      !address?.phone
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid customer info",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid amount",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    /* ================= IDS ================= */

    const orderId = generateOrderId();

    const invoiceType =
      gstType === "B2B"
        ? "TAX"
        : "B2C";

    const invoicePrefix =
      generateInvoicePrefix(
        invoiceType
      );

    /* ================= PAYMENT STATUS ================= */

    let paymentStatus =
      "NOT_INITIATED";

    if (
      paymentMethod === "RAZORPAY"
    ) {
      paymentStatus = "INITIATED";
    }

    if (paymentMethod === "UPI") {
      paymentStatus = "PENDING";
    }

    /* ================= CREATE ================= */

    const order = await Order.create({
      source,

      orderId,

      customerType,

      cart,

      address,

      amount,

      billing,

      discount,

      coupon,

      taxItems,

      gstType,

      gstMode,

      status:
        paymentMethod === "COD"
          ? "CONFIRMED"
          : "PENDING_PAYMENT",

      payment: {
        method: paymentMethod,

        status: paymentStatus,

        amountPaid: 0,
      },

      invoice: {
        invoiceType,

        invoicePrefix,

        status: "NOT_GENERATED",
      },

      auditLogs: [
        {
          action: "ORDER_CREATED",

          message:
            "Order created successfully",

          createdAt: new Date(),
        },
      ],
    });

    /* ================= RAZORPAY ================= */

    let razorpayOrder = null;

    if (
      paymentMethod === "RAZORPAY"
    ) {
      try {
        const Razorpay = (
          await import("razorpay")
        ).default;

        const razorpay =
          new Razorpay({
            key_id:
              process.env
                .RAZORPAY_KEY_ID!,

            key_secret:
              process.env
                .RAZORPAY_KEY_SECRET!,
          });

        razorpayOrder =
          await razorpay.orders.create({
            amount: Math.round(
              amount * 100
            ),

            currency: "INR",

            receipt: orderId,

            notes: {
              orderId,
            },
          });

        order.payment.razorpayOrderId =
          razorpayOrder.id;

        await order.save();
      } catch (err) {
        console.error(
          "RAZORPAY ERROR",
          err
        );
      }
    }

    return NextResponse.json(
      {
        success: true,

        orderId,

        razorpayOrder,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    console.error(
      "ORDER CREATE ERROR",
      err
    );

    return NextResponse.json(
      {
        success: false,

        message:
          err.message ||
          "Internal Server Error",
      },
      {
        status: 500,

        headers: corsHeaders,
      }
    );
  }
}
