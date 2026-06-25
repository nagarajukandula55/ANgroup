import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import { approveVendorProduct }
  from "@/services/productApproval.service";

export async function POST(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const body =
      await req.json();

    const result =
      await approveVendorProduct(
        context.params.id,
        body.approvedBy
      );

    return NextResponse.json({
      success: true,
      data: result,
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
