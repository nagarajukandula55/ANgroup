import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import BOM from "@/models/BOM";

export async function GET(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const bom =
      await BOM.findById(
        params.id
      )
        .populate(
          "productVariantId"
        )
        .populate(
          "items.materialId"
        );

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

export async function PUT(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const bom =
      await BOM.findByIdAndUpdate(
        params.id,
        body,
        {
          new: true,
        }
      );

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

export async function DELETE(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    await BOM.findByIdAndDelete(
      params.id
    );

    return NextResponse.json({
      success: true,
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
