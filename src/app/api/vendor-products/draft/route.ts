import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));

    const draft = await VendorProduct.create({
      productName: "",
      variantName: "",
      description: "",

      vendorSku: "",
      vendorCost: 0,
      vendorShippingCost: 0,
      shippingCostType: "SEPARATE",
      minimumOrderQty: 1,
      leadTimeDays: 0,
      availableStock: 0,

      unit: "",
      packSize: 1,
      netWeight: 0,
      grossWeight: 0,
      hsnCode: "",
      gstRate: 0,

      status: "DRAFT",
      active: true,

      businessId: body.businessId ?? "TEMP",
      createdBy: body.createdBy ?? "SYSTEM",
    });

    return NextResponse.json({
      success: true,
      id: draft._id.toString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
