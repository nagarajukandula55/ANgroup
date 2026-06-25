import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorProduct from "@/models/VendorProduct";

export async function GET() {
  try {
    await connectDB();

    const products =
      await VendorProduct.find({
        approvalStatus: {
          $in: [
            "PENDING",
            "UNDER_REVIEW",
          ],
        },
      })
        .populate("vendorId")
        .populate("categoryId")
        .populate("brandId")
        .sort({
          submittedAt: -1,
        });

    return NextResponse.json({
      success: true,
      data: products,
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
