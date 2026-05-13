import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";
import { generateInvoicePDF } from "@/services/pdf/invoicePdf.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { orderId } = await req.json();

    const order = await Order.findOne({ orderId });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    /* ================= TEMPLATE ================= */
    const template = buildInvoiceTemplate(order);

    /* ================= PDF ================= */
    const pdf = await generateInvoicePDF(template);

    /* ================= SAVE BACK ================= */
    order.invoice.invoiceUrl = pdf.url;

    await order.save();

    return NextResponse.json({
      success: true,
      invoiceUrl: pdf.url,
      invoiceNumber: order.invoice.invoiceNumber,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
