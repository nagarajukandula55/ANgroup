import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ProductVariant from "@/models/ProductVariant";

export async function GET() {
  await connectDB();

  const data =
    await ProductVariant.find()
      .populate("productId")
      .sort({ variantName: 1 });

  return NextResponse.json({
    success: true,
    data,
  });
}

export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();

  const variant =
    await ProductVariant.create(body);

  return NextResponse.json({
    success: true,
    data: variant,
  });
}
