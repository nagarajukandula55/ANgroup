export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import { generateInvoiceHTML } from "@/services/invoice/htmlInvoice.service";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";

export async function GET(req: Request, context: any) {
  try {
    await connectDB();

    const invoiceNumber = context?.params?.invoiceNumber;

    if (!invoiceNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice number required",
        },
        { status: 400 }
      );
    }

    const invoice = await Invoice.findOne({ invoiceNumber });

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice not found",
        },
        { status: 404 }
      );
    }

    const template = buildInvoiceTemplate(invoice.toObject());
    const html = generateInvoiceHTML(template);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
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
