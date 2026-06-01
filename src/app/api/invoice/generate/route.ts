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
    const orderDoc: any = await Order.findOne({ orderId }).lean();

    if (!orderDoc) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const order = orderDoc;

    const safeOrderId = order.orderId || order._id?.toString();

    /* ================= INVOICE GENERATION ================= */
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

    /* ================= BUILD TEMPLATE ================= */
    const template = buildInvoiceTemplate(normalizedOrder);

    /* ================= GENERATE PDF ================= */
    let pdfResult: any;

    try {
      pdfResult = await generateInvoicePDF(template);
    } catch (err: any) {
      console.error("PDF generation failed:", err);

      return NextResponse.json(
        {
          success: false,
          message: "PDF generation failed",
        },
        { status: 500 }
      );
    }

    const pdfUrl = (pdfResult as any)?.url;

    /* ================= SEND EMAIL ================= */
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

    /* ================= UPDATE ORDER ================= */
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
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
