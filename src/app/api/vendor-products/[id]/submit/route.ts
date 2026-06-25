import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProductBOM from "@/models/VendorProductBOM";
import VendorProduct from "@/models/VendorProduct";

export async function POST(req: Request, context: any) {
  try {
    await connectDB();

    const vendorProduct = await VendorProduct.findById(
      context.params.id
    );

    if (!vendorProduct) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    const bomCount = await VendorProductBOM.countDocuments({
      vendorProductId: vendorProduct._id,
    });

    // 🔒 BLOCK IF NO BOM
    if (bomCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please add BOM before submitting product",
        },
        { status: 400 }
      );
    }

    vendorProduct.approvalStatus = "PENDING";
    vendorProduct.submittedAt = new Date();

    await vendorProduct.save();

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
