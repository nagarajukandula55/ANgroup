import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorProduct from "@/models/VendorProduct";
import VendorProductBOM from "@/models/VendorProductBOM";

export async function POST(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const product =
      await VendorProduct.findById(
        context.params.id
      );

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found",
        },
        { status: 404 }
      );
    }

    const bomCount =
      await VendorProductBOM.countDocuments({
        vendorProductId: product._id,
        active: true,
      });

    if (bomCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "At least one BOM item required",
        },
        { status: 400 }
      );
    }

    if (!product.categoryId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Category is required",
        },
        { status: 400 }
      );
    }

    await VendorProduct.findByIdAndUpdate(
      product._id,
      {
        approvalStatus: "PENDING",
        submittedAt: new Date(),
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Submitted for approval",
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
