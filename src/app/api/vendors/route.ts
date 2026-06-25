import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";

export async function GET() {
  try {
    await connectDB();

    const vendors = await Vendor.find({
      active: true,
    })
      .sort({ vendorName: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: vendors,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const vendor = await Vendor.create(body);

    return NextResponse.json({
      success: true,
      data: vendor,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
