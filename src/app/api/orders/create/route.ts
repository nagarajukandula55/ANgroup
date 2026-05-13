import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";

export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();

  const {
    businessId,
    cart,
    address,
    amount,
    paymentMethod,
    gstType,
    gstMode,
  } = body;

  // 🔴 HARD VALIDATION
  if (!businessId) {
    return NextResponse.json(
      { success: false, message: "businessId is required" },
      { status: 400 }
    );
  }

  if (!cart || !cart.length) {
    return NextResponse.json(
      { success: false, message: "Cart is empty" },
      { status: 400 }
    );
  }

  try {
    const orderId = `ORD-${Date.now()}`;

    const order = await Order.create({
      businessId, // 🔥 STRICT ENFORCED
      orderId,
      items: cart,
      address,
      amount,
      payment: {
        method: paymentMethod || "UNKNOWN",
        status: "PENDING",
      },
      status: "PENDING_PAYMENT",
      gstType,
      gstMode,
    });

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      dbId: order._id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
