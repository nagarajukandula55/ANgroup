import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Business from "@/models/Business";

export async function GET() {
  await connectDB();

  try {
    const businesses = await Business.find({})
      .select("name businessCode modules createdAt")
      .lean();

    return NextResponse.json({
      success: true,
      businesses,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
