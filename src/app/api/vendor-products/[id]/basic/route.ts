import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";

type Context = {
  params: {
    id: string;
  };
};

export async function PATCH(req: Request, context: Context) {
  try {
    await connectDB();

    const { id } = context.params;

    const body = await req.json();

    const updated = await VendorProduct.findByIdAndUpdate(
      id,
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
