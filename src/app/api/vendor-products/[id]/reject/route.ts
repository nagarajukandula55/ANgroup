import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorProduct from "@/models/VendorProduct";

export async function POST(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const body =
      await req.json();

    const product =
      await VendorProduct.findByIdAndUpdate(
        context.params.id,
        {
          approvalStatus:
            "REJECTED",

          rejectionReason:
            body.reason,

          approvedAt:
            new Date(),

          approvedBy:
            body.userId,
        },
        {
          new: true,
        }
      );

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
