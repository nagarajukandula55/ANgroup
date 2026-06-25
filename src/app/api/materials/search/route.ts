import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const materials = await Material.find({
      materialName: { $regex: q, $options: "i" },
      active: true,
    })
      .select("_id materialName materialCode unit")
      .limit(20);

    return NextResponse.json({
      success: true,
      data: materials,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
