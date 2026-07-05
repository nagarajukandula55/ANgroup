export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import Order from "@/models/Order";

import { logAction } from "@/lib/audit/logAction";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      orderId,
      invoiceNumber,
      invoiceUrl,
    } = body;

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

    order.invoiceGenerated = true;

    order.invoice = {
      ...order.invoice,

      invoiceNumber,

      invoiceUrl,

      generatedAt: new Date(),

      pdfGenerated: true,
    };

    order.events.push({
      type: "INVOICE_GENERATED",

      message:
        "Invoice generated successfully",

      by: "SYSTEM",

      createdAt: new Date(),
    });

    await order.save();

    logAction({
      action: "GENERATE",
      entity: "Order",
      entityId: order._id?.toString(),
      after: order,
      req,
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Invoice update failed",
      },
      {
        status: 500,
      }
    );
  }
}
