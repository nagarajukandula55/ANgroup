import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Design from "@/models/Design";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const design = await Design.findById(
      params.id
    );

    return NextResponse.json(design);
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();

    const body = await req.json();

    const design =
      await Design.findByIdAndUpdate(
        params.id,
        body,
        {
          new: true,
        }
      );

    return NextResponse.json(design);
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  req,
  { params }
) {
  try {
    await connectDB();

    await Design.findByIdAndDelete(
      params.id
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
