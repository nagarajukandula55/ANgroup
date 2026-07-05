import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
import { logAction } from "@/lib/audit/logAction";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));

    if (!body.businessId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No active business context — please select a business before creating a product draft.",
        },
        { status: 400 }
      );
    }

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

      businessId: body.businessId,
      createdBy: body.createdBy || undefined,
    });

    logAction({
      action: "SAVE_DRAFT",
      entity: "VendorProduct",
      entityId: draft._id?.toString(),
      after: draft,
      req,
      actor: { businessId: body.businessId, id: body.createdBy },
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
