export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { getShiprocketToken } from "@/lib/shipping/shiprocket";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    
    console.log("BODY =", body);
    
    const {
      orderId,
      weight,
      length,
      width,
      height,
    } = body;
    
    console.log("ORDER ID =", orderId);

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID required",
        },
        { status: 400 }
      );
    }

    console.log("REQUEST BODY:", body);
    console.log("ORDER ID RECEIVED:", orderId);

    const order = await Order.findOne({
      orderId: orderId,
    });

    console.log("ORDER FOUND:", order);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    const token =
      await getShiprocketToken();

    const pickupPincode =
      process.env.SHIPROCKET_PICKUP_PINCODE;

    const deliveryPincode =
      order?.address?.pincode;

    if (!deliveryPincode) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer pincode missing",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&cod=0&weight=${weight}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      console.log(result);

      return NextResponse.json(
        {
          success: false,
          message:
            result?.message ||
            "Shiprocket error",
        },
        { status: 400 }
      );
    }

    const couriers =
      result?.data?.available_courier_companies?.map(
        (c: any) => ({
          courierId:
            c.courier_company_id,

          courierName:
            c.courier_name,

          rate:
            c.freight_charge,

          etd:
            c.estimated_delivery_days,

          companyId:
            c.courier_company_id,

          srData: c,
        })
      ) || [];

    return NextResponse.json({
      success: true,
      couriers,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed loading rates",
      },
      {
        status: 500,
      }
    );
  }
}
