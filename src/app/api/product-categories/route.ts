import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ProductCategory from "@/models/ProductCategory";

export async function GET() {
  try {
    await connectDB();

    const categories =
      await ProductCategory.find({
        active: true,
      }).sort({
        categoryName: 1,
      });

    return NextResponse.json({
      success: true,
      data: categories,
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

    const category =
      await ProductCategory.create(
        body
      );

    return NextResponse.json({
      success: true,
      data: category,
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
