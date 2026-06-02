export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";
import { generateInvoiceHTML } from "@/services/invoice/htmlInvoice.service";
import fs from "fs";
import path from "path";

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

    /* ================= FETCH ORDER ================= */
    const order = await Order.findOne({ orderId });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    /* ================= INVOICE ================= */
    let invoiceNumber = "N/A";

    try {
      const invoice = await createInvoiceForOrder(order.orderId);
      invoiceNumber = invoice.invoiceNumber;
    } catch (err: any) {
      invoiceNumber = order.invoice?.invoiceNumber || "EXISTING";
    }

    /* ================= NORMALIZE ================= */
    const normalizedOrder = {
      ...order.toObject(),
      invoice: {
        invoiceNumber,
      },
      billing: {
        subtotal: order.subtotal || 0,
        cgst: order.cgst || 0,
        sgst: order.sgst || 0,
        igst: order.igst || 0,
        grandTotal: order.amount || 0,
      },
    };

    /* ================= TEMPLATE ================= */
    const template = buildInvoiceTemplate(normalizedOrder);

    /* ================= HTML INVOICE ================= */
    const html = generateInvoiceHTML(template);

    /* ================= SAVE FILE ================= */
    const dir = path.join(process.cwd(), "public", "invoices");
    fs.mkdirSync(dir, { recursive: true });

    const fileName = `invoice_${invoiceNumber}.html`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, html, "utf-8");

    const url = `/invoices/${fileName}`;

    /* ================= UPDATE ORDER ================= */
    order.invoice = {
      ...order.invoice,
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
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
