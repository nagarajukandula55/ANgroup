import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Asset from "@/models/Asset";

export async function GET() {
  try {
    await connectDB();

    const assets = await Asset.find().sort({
      createdAt: -1,
    });

    return NextResponse.json(assets);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const asset = await Asset.create(body);

    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
