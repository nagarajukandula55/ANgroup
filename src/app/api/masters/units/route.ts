import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Unit from "@/models/Unit";
import {
  successResponse,
  errorResponse,
} from "@/lib/apiResponse";

/* ================= GET ================= */

export async function GET() {
  try {
    await connectDB();

    const data = await Unit.find()
      .sort({ unitName: 1 })
      .lean();

    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

/* ================= POST ================= */

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const unit = await Unit.create(body);

    return successResponse(
      unit,
      "Unit created successfully"
    );
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

/* ================= PUT ================= */

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const { _id, ...updateData } = body;

    const unit = await Unit.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    return successResponse(
      unit,
      "Unit updated successfully"
    );
  } catch (error: any) {
    return errorResponse(error.message);
  }
}

/* ================= DELETE ================= */

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");

    await Unit.findByIdAndDelete(id);

    return successResponse(
      null,
      "Unit deleted successfully"
    );
  } catch (error: any) {
    return errorResponse(error.message);
  }
}
