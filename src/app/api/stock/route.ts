import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import StockLedger from "@/models/StockLedger";

export async function GET() {
  await dbConnect();

  const data = await StockLedger.find()
    .populate("materialId")
    .populate("warehouseId")
    .sort({ createdAt: -1 });

  return NextResponse.json({ success: true, data });
}
