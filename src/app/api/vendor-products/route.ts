import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
import { logAction } from "@/lib/audit/logAction";

export async function GET() {
  try {
    await connectDB();

    const products =
      await VendorProduct.find()
        .populate("vendorId")
        .populate("categoryId")
        .populate("brandId")
        .sort({ createdAt: -1 });

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

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const product =
      await VendorProduct.create(body);

    logAction({
      action: "CREATE",
      entity: "VendorProduct",
      entityId: product._id?.toString(),
      after: product,
      req,
      actor: { businessId: body.businessId },
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
