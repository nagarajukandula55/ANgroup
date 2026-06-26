import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
import VendorProductBOM from "@/models/VendorProductBOM";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    const product = await VendorProduct.findById(id);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor Product not found",
        },
        { status: 404 }
      );
    }

    const bomItems = await VendorProductBOM.find({
      vendorProductId: id,
      active: true,
    });

    let totalMaterialCost = 0;
    let wastageCost = 0;

    for (const item of bomItems) {
      const base = Number(item.currentCost || 0);
      const wastage =
        (base * Number(item.wastagePercent || 0)) / 100;

      totalMaterialCost += base;
      wastageCost += wastage;
    }

    const vendorCost = Number(product.vendorCost || 0);

    const shippingCost = Number(
      product.vendorShippingCost || 0
    );

    const totalBaseCost =
      totalMaterialCost +
      wastageCost +
      vendorCost +
      shippingCost;

    // Default margin (later this will come from vendor/business agreement)
    const marginPercent = 25;

    const marginAmount =
      (totalBaseCost * marginPercent) / 100;

    const sellingPrice =
      totalBaseCost + marginAmount;

    return NextResponse.json({
      success: true,
      data: {
        materialCost: totalMaterialCost,
        wastageCost,
        vendorCost,
        shippingCost,
        totalBaseCost,
        marginPercent,
        marginAmount,
        sellingPrice,
      },
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
