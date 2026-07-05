import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import { logAction } from "@/lib/audit/logAction";

export async function GET(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const material =
      await Material.findById(
        params.id
      ).populate("categoryId");

    return NextResponse.json({
      success: true,
      data: material,
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

export async function PUT(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const material =
      await Material.findByIdAndUpdate(
        params.id,
        body,
        {
          new: true,
        }
      );

    logAction({
      action: "UPDATE",
      entity: "Material",
      entityId: params.id,
      after: material,
      req,
    });

    return NextResponse.json({
      success: true,
      data: material,
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

export async function DELETE(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    await Material.findByIdAndDelete(
      params.id
    );

    logAction({
      action: "DELETE",
      entity: "Material",
      entityId: params.id,
      req,
    });

    return NextResponse.json({
      success: true,
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
