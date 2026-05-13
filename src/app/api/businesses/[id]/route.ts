import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Business from "@/models/Business";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();

  try {
    const business = await Business.findById(params.id).lean();

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
