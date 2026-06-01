export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";
import { generateInvoicePDF } from "@/services/pdf/invoicePdf.service";
import { sendInvoiceEmail } from "@/services/email/resend.service";

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

    /* ================= FETCH ORDER (SAFE) ================= */
    const order = await Order.findOne({ orderId }).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    /* ================= INVOICE GENERATION ================= */
    let invoiceNumber = "";

    try {
      const invoice = await createInvoiceForOrder(order.orderId);
      invoiceNumber = invoice.invoiceNumber;
    } catch (err: any) {
      console.log("Invoice fallback:", err.message);
      invoiceNumber = order?.invoice?.invoiceNumber || `INV-${Date.now()}`;
    }

    /* ================= NORMALIZE ORDER ================= */
    const normalizedOrder = {
      ...order,

      invoice: {
        ...(order.invoice || {}),
        invoiceNumber,
      },

      billing: {
        subtotal: order?.subtotal || order?.taxableAmount || 0,
        cgst: order?.cgst || 0,
        sgst: order?.sgst || 0,
        igst: order?.igst || 0,
        grandTotal: order?.amount || 0,
        currency: "INR",
      },
    };

    /* ================= BUILD TEMPLATE ================= */
    const template = buildInvoiceTemplate(normalizedOrder);

    /* ================= PDF GENERATION ================= */
    let pdf;

    try {
      pdf = await generateInvoicePDF(template);
    } catch (err: any) {
      console.error("PDF ERROR:", err);

      return NextResponse.json(
        {
          success: false,
          message: "PDF generation failed",
        },
        { status: 500 }
      );
    }

    /* ================= EMAIL (NON-BLOCKING SAFE) ================= */
    try {
      await sendInvoiceEmail({
        to: order?.address?.email,
        customerName: order?.address?.name,
        invoiceNumber,
        pdfUrl: pdf.url,
        grandTotal: order?.amount || 0,
        orderId: order.orderId,
      });
    } catch (err) {
      console.error("Email failed (ignored):", err);
    }

    /* ================= SAVE ORDER ================= */
    await Order.updateOne(
      { orderId },
      {
        $set: {
          "invoice.invoiceNumber": invoiceNumber,
          "invoice.pdfUrl": pdf.url,
          "invoice.invoiceUrl": pdf.url,
        },
      }
    );

    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceUrl: pdf.url,
    });
  } catch (err: any) {
    console.error("INVOICE ROUTE CRASH:", err);

    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
