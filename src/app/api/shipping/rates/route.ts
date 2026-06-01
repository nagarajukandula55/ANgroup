export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

import {
  shiprocketRequest,
} from "@/lib/shipping/shiprocket";

export async function POST(
  req: Request
) {
  try {
    await connectDB();

    const { orderId } =
      await req.json();

    const order =
      await Order.findOne({
        orderId,
      });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
        },
        { status: 404 }
      );
    }

    const pincode =
      order.address?.pincode;

    const pkg =
      order.packageDetails;

    if (
      !pkg?.weight ||
      !pkg?.length ||
      !pkg?.breadth ||
      !pkg?.height
    ) {
      return NextResponse.json({
        success: false,
        message:
          "Package details missing",
      });
    }

    const result =
      await shiprocketRequest(
        `/courier/serviceability/?pickup_postcode=535215&delivery_postcode=${pincode}&cod=0&weight=${pkg.weight}`
      );

    return NextResponse.json({
      success: true,
      couriers:
        result?.data?.available_courier_companies ||
        [],
    });
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
