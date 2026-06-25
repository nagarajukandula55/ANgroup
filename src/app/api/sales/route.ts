import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  createSalesInvoice,
  getAllInvoices,
} from "@/services/sales.service";

/* ================= CREATE INVOICE ================= */
export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();

    const data = await createSalesInvoice(body);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 400 }
    );
  }
}

/* ================= LIST INVOICES ================= */
export async function GET() {
  try {
    await dbConnect();

    const data = await getAllInvoices();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
