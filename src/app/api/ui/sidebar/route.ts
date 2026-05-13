import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Business from "@/models/Business";
import UserBusinessAccess from "@/models/UserBusinessAccess";
import { filterModules } from "@/services/moduleEngine.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { userId, businessId } = await req.json();

    if (!userId || !businessId) {
      return NextResponse.json(
        { success: false, message: "INVALID_INPUT" },
        { status: 400 }
      );
    }

    const business = await Business.findById(businessId)
      .lean()
      .exec();

    const access = await UserBusinessAccess.findOne({
      userId,
      businessId,
    })
      .lean()
      .exec();

    if (!business || !access) {
      return NextResponse.json(
        { success: false, message: "ACCESS_DENIED" },
        { status: 403 }
      );
    }

    /* ================= SAFE NORMALIZATION ================= */
    const safeModules = Array.isArray((business as any)?.modules)
      ? (business as any).modules
      : [];

    const safeAccessKeys = Array.isArray(access?.accessKeys)
      ? access.accessKeys
      : [];

    const modules = filterModules({
      modules: safeModules,
      accessKeys: safeAccessKeys,
    });

    return NextResponse.json({
      success: true,
      modules,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
