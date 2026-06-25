import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";

export async function GET(
  req,
  { params }
) {
  try {
    await connectDB();

    const warehouse =
      await Warehouse.findById(
        params.id
      );

    return NextResponse.json({
      success: true,
      data: warehouse,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req,
  { params }
) {
  try {
    await connectDB();

    const body = await req.json();

    const warehouse =
      await Warehouse.findByIdAndUpdate(
        params.id,
        body,
        { new: true }
      );

    return NextResponse.json({
      success: true,
      data: warehouse,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req,
  { params }
) {
  try {
    await connectDB();

    await Warehouse.findByIdAndDelete(
      params.id
    );

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}
