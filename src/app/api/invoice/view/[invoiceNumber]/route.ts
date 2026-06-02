import { NextResponse } from "next/server";
import Invoice from "@/models/Invoice";

export const runtime = "nodejs";

export async function GET(req: Request, context: any) {
  try {
    const invoiceNumber = context.params.invoiceNumber;

    const invoice = await Invoice.findOne({ invoiceNumber });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...invoice.toObject(),
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
