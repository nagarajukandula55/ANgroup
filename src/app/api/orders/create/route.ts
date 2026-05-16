import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { OrderService } from "@/services/order.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const result = await OrderService.createOrder(body);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Internal Error",
      },
      { status: 500 }
    );
  }
}
