import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const vendor = await Vendor.findById(
      params.id
    );

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

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await req.json();

    const vendor =
      await Vendor.findByIdAndUpdate(
        params.id,
        body,
        { new: true }
      );

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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    await Vendor.findByIdAndUpdate(
      params.id,
      {
        active: false,
      }
    );

    return NextResponse.json({
      success: true,
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
