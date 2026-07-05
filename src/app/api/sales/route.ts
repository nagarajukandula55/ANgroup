import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  createSalesInvoice,
  getAllInvoices,
} from "@/services/sales.service";
import { logAction } from "@/lib/audit/logAction";

/* ================= CREATE INVOICE ================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const data = await createSalesInvoice(body);

    logAction({
      action: "CREATE",
      entity: "SalesInvoice",
      entityId: (data as any)?._id?.toString(),
      after: data,
      req,
    });

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
    await connectDB();

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
