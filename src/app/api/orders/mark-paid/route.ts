import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { generateInvoiceNumber } from "@/lib/numbering/invoiceNumber";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { orderId, mode } = await req.json();

    const order = await Order.findOne({ orderId });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // prevent duplicate marking
    if (order.status === "PAID") {
      return NextResponse.json({
        success: true,
        message: "Already paid",
        invoiceNumber: order.invoice?.invoiceNumber,
      });
    }

    /**
     * SAFETY CHECK (IMPORTANT)
     * mode = "MANUAL" | "SYSTEM"
     */
    if (mode === "SYSTEM") {
      if (order.payment?.status !== "SUCCESS") {
        return NextResponse.json(
          { success: false, message: "Payment not verified" },
          { status: 400 }
        );
      }
    }

    const invoiceNumber = await generateInvoiceNumber(order.businessId);

    order.status = "PAID";

    order.payment = {
      ...order.payment,
      status: "SUCCESS",
    };

    order.invoice = {
      invoiceNumber,
      generatedAt: new Date(),
      invoiceUrl: null,
    };

    await order.save();

    return NextResponse.json({
      success: true,
      invoiceNumber,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
