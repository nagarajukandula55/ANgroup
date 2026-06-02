import { NextResponse } from "next/server";
import Invoice from "@/models/Invoice";
import { connectDB } from "@/lib/mongodb";

export async function GET(
  req: Request,
  { params }: { params: { invoiceNumber: string } }
) {
  try {
    await connectDB();

    const invoice = await Invoice.findOne({
      invoiceNumber: params.invoiceNumber,
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}
