export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";
import { generateInvoicePDF } from "@/services/pdf/invoicePdf.service";
import { sendInvoiceEmail } from "@/services/email/resend.service";
import { generateOrFetchInvoice } from "@/lib/invoice/generateOrFetchInvoice";

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
    const order = await Order.findOne({ orderId }); // 🔥 FIXED

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    /* ================= STEP 1: INVOICE NUMBER (IDEMPOTENT) ================= */
    let invoice;

      try {
        invoice = await createInvoiceForOrder(order.orderId);
      } catch (err: any) {
        // if duplicate or already exists, fetch existing invoice
        console.log("Invoice create failed, fallback:", err.message);
        invoice = {
          invoiceNumber: order.invoice?.invoiceNumber || "EXISTING",
        };
      }
    const isNew = true;

  /* ===========  ============ */ 
    const normalizedOrder = {
      ...order.toObject(),
    
      billing: {
        subtotal: order?.taxableAmount || order?.subtotal || 0,
        cgst: order?.cgst || 0,
        sgst: order?.sgst || 0,
        igst: order?.igst || 0,
        grandTotal: order?.amount || 0,
        currency: "INR",
      },
    };

    /* ================= STEP 2: BUILD TEMPLATE (B2B / B2C SAFE) ================= */
    
    const template = buildInvoiceTemplate(normalizedOrder);

    /* ================= STEP 3: GENERATE PDF ================= */
    let pdf;

      try {
        pdf = await generateInvoicePDF(template);
      } catch (err: any) {
        console.log("PDF generation failed:", err.message);
      
        return NextResponse.json(
          {
            success: false,
            message: "PDF generation failed",
          },
          { status: 500 }
        );
      }

    /* ================= EMAIL TRIGGER ================= */
      await sendInvoiceEmail({
        to: order.address.email,
        customerName: order.address.name,
        invoiceNumber: invoice.invoiceNumber,
        pdfUrl: pdf.url,
        grandTotal: order.billing.grandTotal,
        orderId: order.orderId,
      }).catch((err) => {
        console.error("Email failed:", err);
      });

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
