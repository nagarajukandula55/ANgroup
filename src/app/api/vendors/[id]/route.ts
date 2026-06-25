import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Vendor from "@/models/Vendor";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    const vendor = await Vendor.findById(id);

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
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const vendor = await Vendor.findByIdAndUpdate(
      id,
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
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    await Vendor.findByIdAndUpdate(id, {
      active: false,
    });

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
