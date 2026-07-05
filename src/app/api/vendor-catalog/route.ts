import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorCatalog from "@/models/VendorCatalog";

import { logAction } from "@/lib/audit/logAction";

export async function GET() {
  try {
    await connectDB();

    const catalog =
      await VendorCatalog.find({
        active: true,
      })
        .populate("vendorId")
        .populate("productId")
        .populate("variantId")
        .sort({
          createdAt: -1,
        });

    return NextResponse.json({
      success: true,
      data: catalog,
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

export async function POST(
  req: Request
) {
  try {
    await connectDB();

    const body =
      await req.json();

    const record =
      await VendorCatalog.create(
        body
      );

    logAction({
      action: "CREATE",
      entity: "VendorCatalog",
      entityId: record?._id?.toString(),
      after: record,
      req,
    });

    return NextResponse.json({
      success: true,
      data: record,
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
