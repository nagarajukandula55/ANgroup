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

    const body = await req.json().catch(() => ({}));
    const orderId = body?.orderId;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId required" },
        { status: 400 }
      );
    }

    /* ================= FETCH ORDER ================= */
    const order = await Order.findOne({ orderId }).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const safeOrderId = order.orderId || order._id?.toString();

    /* ================= INVOICE ================= */
    let invoiceNumber = "N/A";

    try {
      const invoice = await createInvoiceForOrder(safeOrderId);
      invoiceNumber = invoice?.invoiceNumber || "N/A";
    } catch (err: any) {
      console.log("Invoice fallback:", err?.message);
      invoiceNumber = order?.invoice?.invoiceNumber || "N/A";
    }

    /* ================= NORMALIZE ORDER ================= */
    const normalizedOrder = {
      ...order,
      invoice: {
        ...order.invoice,
        invoiceNumber,
      },
      billing: {
        subtotal: order?.subtotal || order?.taxableAmount || 0,
        cgst: order?.cgst || 0,
        sgst: order?.sgst || 0,
        igst: order?.igst || 0,
        grandTotal: order?.amount || order?.subtotal || 0,
        currency: "INR",
      },
    };

    /* ================= TEMPLATE ================= */
    const template = buildInvoiceTemplate(normalizedOrder);

    /* ================= PDF GENERATION ================= */
    let pdfResult: any;

    try {
      pdfResult = await generateInvoicePDF(template);
    } catch (err: any) {
      console.error("PDF generation failed:", err?.message);

      return NextResponse.json(
        {
          success: false,
          message: "PDF generation failed",
          error: err?.message,
        },
        { status: 500 }
      );
    }

    const pdfUrl = (pdfResult as any)?.url;

    /* ================= EMAIL ================= */
    try {
      await sendInvoiceEmail({
        to: order?.address?.email,
        customerName: order?.address?.name,
        invoiceNumber,
        pdfUrl,
        grandTotal: order?.amount,
        orderId: safeOrderId,
      });
    } catch (err) {
      console.error("Email failed:", err);
    }

    /* ================= SAVE ORDER ================= */
    await Order.updateOne(
      { orderId },
      {
        $set: {
          "invoice.invoiceNumber": invoiceNumber,
          "invoice.pdfUrl": pdfUrl,
          "invoice.invoiceGenerated": true,
        },
      }
    );

    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceUrl: pdfUrl,
    });
  } catch (err: any) {
    console.error("INVOICE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal error",
      },
      { status: 500 }
    );
  }
}
