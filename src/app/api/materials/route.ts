import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import { logAction } from "@/lib/audit/logAction";

export async function GET() {
  try {
    await connectDB();

    const materials = await Material.find()
      .populate("categoryId")
      .sort({ materialName: 1 });

    return NextResponse.json({
      success: true,
      data: materials,
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

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const material =
      await Material.create(body);

    logAction({
      action: "CREATE",
      entity: "Material",
      entityId: material?._id?.toString(),
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
