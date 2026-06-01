export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import Order from "@/models/Order";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      orderId,
      weight,
      length,
      breadth,
      height,
    } = body;

    const order = await Order.findOne({
      orderId,
    });

    if (!order) {
      return NextResponse.json({
        success: false,
        message: "Order not found",
      });
    }

    order.shipping = {
      ...order.shipping,

      package: {
        weight,
        length,
        breadth,
        height,
      },
    };

    await order.save();

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
