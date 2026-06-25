import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
import VendorProductBOM from "@/models/VendorProductBOM";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const product = await VendorProduct.findById(params.id);

    const bomItems = await VendorProductBOM.find({
      vendorProductId: params.id,
      active: true,
    });

    let totalCost = 0;

    for (const item of bomItems) {
      const base = item.currentCost || 0;
      const wastage = (base * item.wastagePercent) / 100;

      totalCost += base + wastage;
    }

    const vendorCost =
      product.vendorCost || 0;

    const shipping =
      product.vendorShippingCost || 0;

    const totalBase = totalCost + vendorCost + shipping;

    // 🔥 SIMPLE MARKETPLACE MARGIN MODEL (CAN EVOLVE LATER)
    const marginPercent = 25;

    const marginAmount =
      (totalBase * marginPercent) / 100;

    const sellingPrice = totalBase + marginAmount;

    return NextResponse.json({
      success: true,
      data: {
        sellingPrice,
        marginAmount,
        marginPercent,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
