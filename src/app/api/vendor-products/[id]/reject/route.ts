import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";

export async function POST(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const vendorProduct =
      await VendorProduct.findById(
        (await context.params).id
      );

    if (!vendorProduct) {
      return NextResponse.json(
        {
          success: false,
          message: "Not found",
        },
        { status: 404 }
      );
    }

    vendorProduct.approvalStatus =
      "REJECTED";

    vendorProduct.rejectionReason =
      body.reason || "";

    await vendorProduct.save();

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
