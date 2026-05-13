import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import crypto from "crypto";

/* ================= CORS ================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://shopnative.in",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/* ================= OPTIONS (CORS PRE-FLIGHT) ================= */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/* ================= ORDER ID GENERATOR ================= */
function generateOrderId() {
  const ts = Date.now();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${ts}-${rand}`;
}

/* ================= MAIN ================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      cart,
      address,
      amount,
      paymentMethod,
      coupon,
      discount = 0,
      gstType = "B2C",
      gstMode = "CGST_SGST",
    } = body;

    /* ================= VALIDATION ================= */
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!address?.phone || !address?.name) {
      return NextResponse.json(
        { success: false, message: "Invalid address" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid amount" },
        { status: 400, headers: corsHeaders }
      );
    }

    /* ================= IDENTITY ================= */
    const orderId = generateOrderId();

    /* ================= ITEM TRANSFORM ================= */
    const items = cart.map((item: any) => ({
      productId: item.productId,
      name: item.name,
      qty: item.qty,
      price: item.price,
      variant: item.variant || "default",
    }));

    /* ================= BILLING SNAPSHOT ================= */
    const billing = {
      subtotal: amount,
      discount,
      grandTotal: amount - discount,
      locked: true,
    };

    /* ================= CREATE ORDER ================= */
    const order = await Order.create({
      orderId,
      items,
      address,
      amount,
      billing,

      payment: {
        method: paymentMethod || "RAZORPAY",
        status: "INITIATED",
        amountPaid: 0,
      },

      status: "PENDING_PAYMENT",

      coupon,
      discount,

      gstType,
      gstMode,

      events: [
        {
          type: "ORDER_CREATED",
          data: { amount, gstType, paymentMethod },
        },
      ],
    });

    /* ================= RAZORPAY INIT (OPTIONAL LAYER) ================= */
    let razorpayOrder = null;

    if (paymentMethod === "RAZORPAY") {
      try {
        const Razorpay = (await import("razorpay")).default;

        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID!,
          key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(amount * 100),
          currency: "INR",
          receipt: orderId,
        });

        order.payment.razorpay_order_id = razorpayOrder.id;

        await order.save();
      } catch (err) {
        console.error("Razorpay init error:", err);
      }
    }

    /* ================= RESPONSE ================= */
    return NextResponse.json(
      {
        success: true,
        orderId,
        razorpayOrder,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("ORDER CREATE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Internal Server Error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
