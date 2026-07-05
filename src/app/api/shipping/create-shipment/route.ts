export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import { createShipment } from "@/lib/shipping/create-shipment";

import { logAction } from "@/lib/audit/logAction";

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
    
      weight,
      length,
      width,
      height,
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
    
      weight,
      length,
      width,
      height,
    });

    logAction({
      action: "CREATE_SHIPMENT",
      entity: "Order",
      entityId: result?.order?._id?.toString(),
      after: result?.order,
      req,
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
