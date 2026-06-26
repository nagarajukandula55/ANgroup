import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";

export async function PATCH(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await req.json();

    const updated = await VendorProduct.findByIdAndUpdate(
      context.params.id,
      body,
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: updated,
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
