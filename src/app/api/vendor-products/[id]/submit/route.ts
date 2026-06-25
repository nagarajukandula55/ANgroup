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

    /* =========================================================
       🚨 BLOCK IF ALREADY SUBMITTED OR LOCKED
    ========================================================= */
    if (vendorProduct.approvalStatus !== "DRAFT") {
      return NextResponse.json(
        {
          success: false,
          message: "Product already submitted or locked",
        },
        { status: 400 }
      );
    }

    /* =========================================================
       🚨 BOM VALIDATION
    ========================================================= */
    const bomCount = await VendorProductBOM.countDocuments({
      vendorProductId: vendorProduct._id,
      active: true,
    });

    if (bomCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please add BOM before submitting product",
        },
        { status: 400 }
      );
    }

    /* =========================================================
       🧠 SNAPSHOT COST LOCK (FREEZE PRICING STATE)
    ========================================================= */
    const snapshot = {
      totalCost: vendorProduct.calculatedCost?.finalCost || 0,
      baseCost: vendorProduct.calculatedCost?.baseCost || 0,
      shippingCost: vendorProduct.calculatedCost?.shippingCost || 0,
      wastageCost: vendorProduct.calculatedCost?.wastageCost || 0,
    };

    /* =========================================================
       🔒 UPDATE STATE (SUBMIT FOR APPROVAL)
    ========================================================= */
    vendorProduct.approvalStatus = "PENDING";
    vendorProduct.submittedAt = new Date();

    // CRITICAL: freeze editing
    vendorProduct.priceFrozen = true;

    // lock snapshot for audit + admin view
    vendorProduct.priceSnapshot = snapshot;

    await vendorProduct.save();

    return NextResponse.json({
      success: true,
      message: "Product submitted for approval",
      data: {
        id: vendorProduct._id,
        status: vendorProduct.approvalStatus,
        priceFrozen: vendorProduct.priceFrozen,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
