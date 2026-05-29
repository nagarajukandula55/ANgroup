export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { updateOrderStatus } from "@/lib/order/update-order-status";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      orderIds,
      status,
      by = "ADMIN",
    } = body;

    if (
      !Array.isArray(orderIds) ||
      !status
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payload",
        },
        {
          status: 400,
        }
      );
    }

    const results = [];

    for (const orderId of orderIds) {
      try {
        const result =
          await updateOrderStatus({
            orderId,
            newStatus: status,
            by,
          });

        results.push({
          orderId,
          success: true,
          order: result.order,
        });
      } catch (err: any) {
        results.push({
          orderId,
          success: false,
          message: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Bulk update failed",
      },
      {
        status: 500,
      }
    );
  }
}
