import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import GRN from "@/models/GRN";

export async function GET(_: Request, { params }: any) {
  await dbConnect();

  const data = await GRN.findById(params.id)
    .populate("poId")
    .populate("vendorId")
    .populate("items.materialId");

  return NextResponse.json({ success: true, data });
}
