export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { getShiprocketToken } from "@/lib/shipping/shiprocket";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      orderId,
      weight = 0.5,
      length,
      width,
      height,
    } = body;

    console.log("================================");
    console.log("SHIPPING RATE REQUEST");
    console.log("BODY:", body);
    console.log("ORDER ID:", orderId);

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID required",
        },
        { status: 400 }
      );
    }

    const order = await Order.findOne({
      orderId: String(orderId).trim(),
    }).lean();

    console.log(
      "ORDER FOUND:",
      order ? "YES" : "NO"
    );

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    const pickupPincode =
      process.env.SHIPROCKET_PICKUP_PINCODE;

    const deliveryPincode =
      order?.address?.pincode;

    console.log(
      "PICKUP PINCODE:",
      pickupPincode
    );

    console.log(
      "DELIVERY PINCODE:",
      deliveryPincode
    );

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

    const token =
      await getShiprocketToken();

    const url =
      `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${pickupPincode}` +
      `&delivery_postcode=${deliveryPincode}` +
      `&cod=0` +
      `&weight=${weight}`;

    console.log(
      "SHIPROCKET URL:",
      url
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result =
      await response.json();

    console.log(
      "SHIPROCKET RESPONSE:"
    );

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            result?.message ||
            "Shiprocket error",
          shiprocket: result,
        },
        { status: 400 }
      );
    }

    const available =
      result?.data
        ?.available_courier_companies || [];

    console.log(
      "AVAILABLE COURIERS:",
      available.length
    );

    const couriers =
      available.map((c: any) => ({
        courierId:
          c.courier_company_id,

        courierName:
          c.courier_name,

        rate:
          c.freight_charge,

        etd:
          c.estimated_delivery_days,

        courier_company_id:
          c.courier_company_id,

        courier_name:
          c.courier_name,

        freight_charge:
          c.freight_charge,

        estimated_delivery_days:
          c.estimated_delivery_days,

        srData: c,
      }));

    console.log(
      "FINAL COURIERS:",
      JSON.stringify(
        couriers,
        null,
        2
      )
    );

    return NextResponse.json({
      success: true,
      count: couriers.length,
      couriers,
    });
  } catch (error: any) {
    console.error(
      "RATE API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed loading rates",
      },
      {
        status: 500,
      }
    );
  }
}
