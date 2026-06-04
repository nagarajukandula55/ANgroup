export const runtime = "nodejs";

import { NextResponse }
from "next/server";

import { connectDB }
from "@/lib/mongodb";

import Order from "@/models/Order";

import { syncTracking }
from "@/lib/shipping/sync-tracking";

export async function POST() {
  try {
    await connectDB();

    const orders =
      await Order.find({
        status: {
          $in: [
            "DISPATCHED",
            "OUT_FOR_DELIVERY",
          ],
        },

        "shipping.awbNumber": {
          $exists: true,
        },
      });

    const results = [];

    for (const order of orders) {
      try {
        const data =
          await syncTracking(
            order.shipping.awbNumber
          );

        results.push(data);
      } catch (err) {
        console.log(
          "TRACK FAIL:",
          order.orderId
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed:
        results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}
