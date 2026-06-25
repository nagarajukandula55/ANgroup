import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProductBOM from "@/models/VendorProductBOM";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const items = await VendorProductBOM.find({
      vendorProductId: params.id,
      active: true,
    });

    let totalMaterialCost = 0;
    let wastageCost = 0;

    for (const item of items) {
      const base = item.currentCost || 0;

      const wastage = (base * item.wastagePercent) / 100;

      totalMaterialCost += base;
      wastageCost += wastage;
    }

    const finalCost = totalMaterialCost + wastageCost;

    return NextResponse.json({
      success: true,
      data: {
        totalMaterialCost,
        wastageCost,
        finalCost,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
