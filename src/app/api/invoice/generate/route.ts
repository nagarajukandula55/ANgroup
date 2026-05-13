import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Order from "@/models/Order";
import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
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

    /* ================= STEP 1: ENSURE INVOICE NUMBER ================= */
    const invoice = await createInvoiceForOrder(orderId);

    /* ================= STEP 2: BUILD TEMPLATE ================= */
    const template = buildInvoiceTemplate(order);

    /* ================= STEP 3: GENERATE PDF ================= */
    const pdf = await generateInvoicePDF(template);

    /* ================= STEP 4: SAVE BACK ================= */
    order.invoice.invoiceUrl = pdf.url;
    order.invoice.pdfUrl = pdf.url;

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
