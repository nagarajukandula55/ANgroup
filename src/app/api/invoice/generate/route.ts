export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";
import { generateInvoicePDF } from "@/services/pdf/invoicePdf.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId required" },
        { status: 400 }
      );
    }

    /* ================= STEP 0: FETCH ORDER ================= */
    const order = await Order.findById(orderId); // 🔥 FIXED

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    /* ================= STEP 1: INVOICE NUMBER (IDEMPOTENT) ================= */
    const { invoice, isNew } = await generateOrFetchInvoice(order);

    /* ================= STEP 2: BUILD TEMPLATE (B2B / B2C SAFE) ================= */
    const template = buildInvoiceTemplate({
      ...order.toObject(),
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: order.customerType || "B2C",
    });

    /* ================= STEP 3: GENERATE PDF ================= */
    const pdf = await generateInvoicePDF(template);

    /* ================= STEP 4: SAFE ORDER UPDATE ================= */
    if (!order.invoice) {
      order.invoice = {};
    }

    order.invoice.invoiceUrl = pdf.url;
    order.invoice.pdfUrl = pdf.url;
    order.invoice.invoiceNumber = invoice.invoiceNumber;

    await order.save();

    return NextResponse.json({
      success: true,
      invoiceNumber: invoice.invoiceNumber,
      invoiceUrl: pdf.url,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
