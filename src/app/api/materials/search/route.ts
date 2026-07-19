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
      .select("_id materialName materialCode stockUnit")
      .limit(20)
      .lean();

    // Material has no plain `unit` field (purchaseUnit/stockUnit/
    // consumptionUnit instead) -- selecting a nonexistent field name is a
    // silent no-op in Mongoose, so every caller of this search (BOM
    // material picker, both the wizard step and the standalone BOM page)
    // always got `unit: undefined` back, which then failed
    // VendorProductBOM's required `unit` field validation on save. Map to
    // the `unit` shape every consumer already expects.
    const data = materials.map((m: any) => ({
      _id: m._id,
      materialName: m.materialName,
      materialCode: m.materialCode,
      unit: m.stockUnit,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
