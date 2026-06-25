import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET() {
  await connectDB();

  const products =
    await Product.find()
      .populate("categoryId")
      .populate("brandId")
      .sort({ productName: 1 });

  return NextResponse.json({
    success: true,
    data: products,
  });
}

export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();

  const product =
    await Product.create(body);

  return NextResponse.json({
    success: true,
    data: product,
  });
}
