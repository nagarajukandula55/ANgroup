import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProductBOM from "@/models/VendorProductBOM";

export async function GET(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const data = await VendorProductBOM.find({
      vendorProductId: id,
    });

    return NextResponse.json({
      success: true,
      data,
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
