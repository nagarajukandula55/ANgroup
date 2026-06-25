import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import BOM from "@/models/BOM";

export async function GET() {
  try {
    await connectDB();

    const data = await BOM.find()
      .populate({
        path: "productVariantId",
        select:
          "variantCode variantName sku",
      })
      .sort({
        createdAt: -1,
      });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  req: Request
) {
  try {
    await connectDB();

    const body = await req.json();

    const bom =
      await BOM.create(body);

    return NextResponse.json({
      success: true,
      data: bom,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      {
        status: 500,
      }
    );
  }
}
