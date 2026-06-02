export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import { gstInvoiceTemplate } from "@/services/invoice/templates/gstInvoiceTemplate";

export async function GET(req: Request, context: any) {
  try {
    await connectDB();

    const invoiceNumber = context?.params?.invoiceNumber;

    const invoice = await Invoice.findOne({ invoiceNumber });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 }
      );
    }

    const html = gstInvoiceTemplate(invoice);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
