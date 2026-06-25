import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  getPurchaseOrderById,
  updatePurchaseOrder,
  approvePurchaseOrder,
} from "@/services/purchaseOrder.service";

export async function GET(_: Request, { params }: any) {
  await connectDB();

  const data = await getPurchaseOrderById(params.id);

  return NextResponse.json({ success: true, data });
}

export async function PUT(req: Request, { params }: any) {
  await connectDB();

  const body = await req.json();

  const data = await updatePurchaseOrder(params.id, body);

  return NextResponse.json({ success: true, data });
}

/* OPTIONAL: approve endpoint */
export async function PATCH(_: Request, { params }: any) {
  await connectDB();

  const data = await approvePurchaseOrder(params.id);

  return NextResponse.json({ success: true, data });
}
