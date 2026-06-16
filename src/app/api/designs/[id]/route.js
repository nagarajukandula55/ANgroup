import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Design from "@/models/Design";

export async function GET(req, { params }) {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid Design ID" },
        { status: 400 }
      );
    }

    const design = await Design.findById(params.id);

    if (!design) {
      return NextResponse.json(
        { error: "Design not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(design);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid Design ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const design = await Design.findByIdAndUpdate(
      params.id,
      body,
      { new: true }
    );

    return NextResponse.json(design);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid Design ID" },
        { status: 400 }
      );
    }

    await Design.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
