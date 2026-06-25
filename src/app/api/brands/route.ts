import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Brand from "@/models/Brand";

export async function GET() {
  try {
    await connectDB();

    const brands =
      await Brand.find({
        active: true,
      }).sort({
        brandName: 1,
      });

    return NextResponse.json({
      success: true,
      data: brands,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request
) {
  try {
    await connectDB();

    const body =
      await req.json();

    const brand =
      await Brand.create(body);

    return NextResponse.json({
      success: true,
      data: brand,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}
