import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";

export async function GET(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const product =
      await VendorProduct.findById(
        context.params.id
      )
        .populate("vendorId")
        .populate("categoryId")
        .populate("brandId")
        .populate("approvedBy");

    return NextResponse.json({
      success: true,
      data: product,
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

    const body = await req.json();

    const product =
      await VendorProduct.findByIdAndUpdate(
        context.params.id,
        body,
        { new: true }
      );

    return NextResponse.json({
      success: true,
      data: product,
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

    await VendorProduct.findByIdAndUpdate(
      context.params.id,
      {
        active: false,
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
