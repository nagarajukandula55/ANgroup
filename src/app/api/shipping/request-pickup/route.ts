import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requestPickup } from "@/lib/shipping/request-pickup";

import { logAction } from "@/lib/audit/logAction";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order ID required" },
        { status: 400 }
      );
    }

    const result = await requestPickup(orderId);

    logAction({
      action: "REQUEST_PICKUP",
      entity: "Order",
      entityId: orderId,
      after: result,
      req,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
