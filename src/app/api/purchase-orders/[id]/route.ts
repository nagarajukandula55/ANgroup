import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import PurchaseOrder from "@/models/PurchaseOrder";

/* ================= GET SINGLE PO ================= */
export async function GET(_: Request, { params }: any) {
  await dbConnect();

  const po = await PurchaseOrder.findById(params.id)
    .populate("vendorId")
    .populate("items.materialId");

  return NextResponse.json({ success: true, data: po });
}

/* ================= UPDATE PO ================= */
export async function PUT(req: Request, { params }: any) {
  await dbConnect();

  const body = await req.json();

  const updated = await PurchaseOrder.findByIdAndUpdate(
    params.id,
    body,
    { new: true }
  );

  return NextResponse.json({ success: true, data: updated });
}
