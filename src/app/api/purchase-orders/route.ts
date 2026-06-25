import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";

function generatePONumber() {
  return "PO-" + Date.now();
}

/* ================= CREATE PO ================= */
export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();

    const po = await PurchaseOrder.create({
      ...body,
      poNumber: generatePONumber(),
    });

    return NextResponse.json({ success: true, data: po });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/* ================= LIST PO ================= */
export async function GET() {
  try {
    await dbConnect();

    const data = await PurchaseOrder.find()
      .populate("vendorId")
      .populate("items.materialId")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
