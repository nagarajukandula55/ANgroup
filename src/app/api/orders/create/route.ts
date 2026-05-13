import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { resolveBusiness } from "@/lib/business/resolver";

import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://shopnative.in",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  await connectDB();

  const business = await resolveBusiness(req);

  if (!business) {
    return NextResponse.json(
      { success: false, message: "Business context not found" },
      { status: 400 }
    );
  }

  const body = await req.json();

  const { cart, address, amount, paymentMethod } = body;

  if (!cart?.length) {
    return NextResponse.json(
      { success: false, message: "Cart empty" },
      { status: 400 }
    );
  }

  const orderId = `ORD-${Date.now()}`;

  const order = await Order.create({
    businessId: business._id, // 🔥 AUTO-INJECTED (NO FRONTEND TRUST)
    orderId,
    items: cart,
    address,
    amount,
    payment: {
      method: paymentMethod || "UNKNOWN",
      status: "PENDING",
    },
    status: "PENDING_PAYMENT",
  });

  return NextResponse.json({
    success: true,
    orderId: order.orderId,
  });
}
