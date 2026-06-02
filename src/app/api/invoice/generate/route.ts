export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";
import { generateInvoiceHTML } from "@/services/invoice/htmlInvoice.service";
import fs from "fs";
import path from "path";

/* ================= GET BLOCK (FIX 405 ISSUE) ================= */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Use POST method only for invoice generation",
    },
    { status: 405 }
  );
}

/* ================= POST ================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    const orderId = body?.orderId;

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId required" },
        { status: 400 }
      );
    }

    /* ================= FETCH ORDER ================= */
    const order = await Order.findOne({ orderId });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    const orderObj = order.toObject();

    /* ================= INVOICE GENERATION ================= */
    let invoiceNumber = orderObj?.invoice?.invoiceNumber || "N/A";

    try {
      const invoice = await createInvoiceForOrder(orderObj.orderId);
      invoiceNumber = invoice.invoiceNumber;
    } catch (err) {
      console.log("Invoice fallback:", err);
    }

    /* ================= SAFE NORMALIZATION ================= */
    const normalizedOrder = {
      ...orderObj,

      invoice: {
        ...(orderObj.invoice || {}),
        invoiceNumber,
      },

      billing: {
        subtotal: orderObj.subtotal || orderObj.taxableAmount || 0,
        cgst: orderObj.cgst || 0,
        sgst: orderObj.sgst || 0,
        igst: orderObj.igst || 0,
        grandTotal: orderObj.amount || orderObj.billing?.grandTotal || 0,
        currency: "INR",
      },
    };

    /* ================= TEMPLATE ================= */
    const template = buildInvoiceTemplate(normalizedOrder);

    /* ================= HTML GENERATION (SAFE WRAP) ================= */
    let html = "";

    try {
      html = generateInvoiceHTML(template);
    } catch (err: any) {
      console.error("HTML generation failed:", err);
      return NextResponse.json(
        { success: false, message: "HTML generation failed" },
        { status: 500 }
      );
    }

    /* ================= SAVE FILE ================= */
    const dir = path.join(process.cwd(), "public", "invoices");
    fs.mkdirSync(dir, { recursive: true });

    const fileName = `invoice_${invoiceNumber}.html`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, html, "utf-8");

    const url = `/invoices/${fileName}`;

    /* ================= ORDER UPDATE ================= */
    order.invoice = {
      ...(order.invoice || {}),
      invoiceNumber,
      invoiceUrl: url,
      pdfGenerated: true,
    };

    await order.save();

    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceUrl: url,
    });
  } catch (err: any) {
    console.error("INVOICE API ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
