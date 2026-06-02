import { NextResponse } from "next/server";
import Invoice from "@/models/Invoice";
import { connectDB } from "@/lib/mongodb";

export const runtime = "nodejs";

/* =========================================
   GET INVOICE BY INVOICE NUMBER
========================================= */
export async function GET(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const invoiceNumber =
      context?.params?.invoiceNumber;

    if (!invoiceNumber) {
      return NextResponse.json(
        {
          success: false,
          message: "invoiceNumber required",
        },
        { status: 400 }
      );
    }

    const invoice = await Invoice.findOne({
      invoiceNumber,
    });

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (err: any) {
    console.error("GET INVOICE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}
