export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { createShipment } from "@/lib/shipping/create-shipment";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      orderId,
      dispatchType,
      courierPartner,
      courierId,
      awbNumber,
      trackingUrl,
      by,
    } = body;

    const result =
      await createShipment({
        orderId,
        dispatchType,
        courierPartner,
        courierId,
        awbNumber,
        trackingUrl,
        by,
      });

    return NextResponse.json(result);
  } catch (error: any) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Shipment failed",
      },
      {
        status: 500,
      }
    );
  }
}
