export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import Order from "@/models/Order";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "orderId required",
        },
        {
          status: 400,
        }
      );
    }

    const order = await Order.findOne({
      orderId,
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        {
          status: 404,
        }
      );
    }

    /* =========================================
       MOCK COURIERS
       LATER SHIPROCKET / DELHIVERY
    ========================================= */

    const couriers = [
      {
        courierId: "DTDC_AIR",

        courierName: "DTDC Air",

        rate: 120,

        etd: "2-4 Days",
      },

      {
        courierId: "BLUEDART",

        courierName: "BlueDart",

        rate: 180,

        etd: "1-2 Days",
      },

      {
        courierId: "DELHIVERY",

        courierName: "Delhivery",

        rate: 95,

        etd: "3-5 Days",
      },

      {
        courierId: "XPRESSBEES",

        courierName: "XpressBees",

        rate: 90,

        etd: "3-6 Days",
      },
    ];

    return NextResponse.json({
      success: true,

      couriers,
    });
  } catch (error: any) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to fetch rates",
      },
      {
        status: 500,
      }
    );
  }
}
