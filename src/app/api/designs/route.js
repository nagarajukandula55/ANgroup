import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Design from "@/models/Design";

export async function GET() {
  try {
    await connectDB();

    const designs = await Design.find().sort({
      createdAt: -1,
    });

    return NextResponse.json(designs);
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

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const design = await Design.create({
      name: body.name,
      width: body.width,
      height: body.height,
      canvasJson: body.canvasJson || {},
      thumbnail: body.thumbnail || "",
      category: body.category || "label",
      tags: body.tags || [],
      status: body.status || "Draft",
    });

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
