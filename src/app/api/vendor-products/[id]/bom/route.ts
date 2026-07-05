import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorProductBOM from "@/models/VendorProductBOM";
import Material from "@/models/Material";
import VendorProduct from "@/models/VendorProduct";
import { recalcVendorProductCost } from "@/services/costEngine.service";
import { logAction } from "@/lib/audit/logAction";

/* =========================================================
GET BOM
========================================================= */

export async function GET(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const items =
      await VendorProductBOM.find({
        vendorProductId:
          (await context.params).id,
        active: true,
      })
        .populate("materialId")
        .sort({ materialName: 1 });

    return NextResponse.json({
      success: true,
      data: items,
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

/* =========================================================
ADD MATERIAL
========================================================= */

export async function POST(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const material =
      await Material.findById(
        body.materialId
      );

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Material not found",
        },
        { status: 404 }
      );
    }

    await recalcVendorProductCost(
      (await context.params).id
    );

    const item =
      await VendorProductBOM.create({
        vendorProductId:
          (await context.params).id,

        businessId:
          body.businessId,

        materialId:
          material._id,

        materialCode:
          material.materialCode,

        materialName:
          material.materialName,

        quantity:
          body.quantity,

        unit:
          body.unit,

        wastagePercent:
          body.wastagePercent || 0,

        currentRate:
          body.currentRate || 0,

        currentCost:
          body.currentCost || 0,

        remarks:
          body.remarks || "",

        createdBy:
          body.createdBy,
      });

    logAction({
      action: "UPDATE",
      entity: "VendorProductBOM",
      entityId: item._id?.toString(),
      after: item,
      req,
      actor: { businessId: body.businessId },
    });

    return NextResponse.json({
      success: true,
      data: item,
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

/* =========================================================
UPDATE BOM ITEM
========================================================= */

export async function PUT(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const item =
      await VendorProductBOM.findByIdAndUpdate(
        body.bomId,
        body,
        {
          new: true,
        }
      );

    logAction({
      action: "UPDATE",
      entity: "VendorProductBOM",
      entityId: body.bomId,
      after: item,
      req,
    });

    return NextResponse.json({
      success: true,
      data: item,
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

/* =========================================================
DELETE BOM ITEM
========================================================= */

export async function DELETE(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const { searchParams } =
      new URL(req.url);

    const bomId =
      searchParams.get("bomId");

    if (!bomId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "bomId required",
        },
        { status: 400 }
      );
    }

    await VendorProductBOM.findByIdAndUpdate(
      bomId,
      {
        active: false,
      }
    );

    logAction({
      action: "DELETE",
      entity: "VendorProductBOM",
      entityId: bomId,
      req,
    });

    return NextResponse.json({
      success: true,
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
