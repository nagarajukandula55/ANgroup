import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorCatalog from "@/models/VendorCatalog";

export async function GET(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const record =
      await VendorCatalog.findById(
        context.params.id
      )
        .populate("vendorId")
        .populate("productId")
        .populate("variantId");

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

export async function PUT(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const body =
      await req.json();

    const record =
      await VendorCatalog.findByIdAndUpdate(
        context.params.id,
        body,
        {
          new: true,
        }
      );

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

export async function DELETE(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    await VendorCatalog.findByIdAndUpdate(
      context.params.id,
      {
        active: false,
        status: "INACTIVE",
      }
    );

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
