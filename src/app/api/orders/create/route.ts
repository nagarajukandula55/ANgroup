import { NextResponse } from "next/server";
import { connectNativeDB } from "@/lib/native-mongodb";
import { OrderService } from "@/services/order.service";

export async function POST(req: Request) {
  try {
    console.log("============ CREATE ORDER API ============");

    await connectNativeDB();

    const body = await req.json();

    console.log(
      "ORDER PAYLOAD:",
      JSON.stringify(body, null, 2)
    );

    const result =
      await OrderService.createOrder(body);

    console.log("ORDER CREATED:", result.orderId);

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      amount: result.amount,
      items: result.items,
    });

  } catch (err: any) {
    console.error("ORDER CREATE FAILED:");
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message,
      },
      { status: 500 }
    );
  }
}
