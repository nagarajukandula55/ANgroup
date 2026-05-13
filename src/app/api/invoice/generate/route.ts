import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { generateInvoice } from "@/services/invoice.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { orderId } = await req.json();

    const invoice = await generateInvoice(orderId);

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
