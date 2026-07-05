import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
import { logAction } from "@/lib/audit/logAction";

export async function GET(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const product =
      await VendorProduct.findById(
        (await context.params).id
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

    const productId = (await context.params).id;

    const product =
      await VendorProduct.findByIdAndUpdate(
        productId,
        body,
        { new: true }
      );

    logAction({
      action: "UPDATE",
      entity: "VendorProduct",
      entityId: productId,
      after: body,
      req,
      actor: { businessId: product?.businessId?.toString() },
    });

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

    const productId = (await context.params).id;

    await VendorProduct.findByIdAndUpdate(
      productId,
      {
        active: false,
      }
    );

    logAction({
      action: "DELETE",
      entity: "VendorProduct",
      entityId: productId,
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
