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

    /* ================= BUSINESS ================= */
    const businessDoc = await Business.findById(businessId)
      .lean()
      .exec();

    const safeBusiness = Array.isArray(businessDoc)
      ? businessDoc[0]
      : businessDoc;

    if (!safeBusiness) {
      return NextResponse.json(
        { success: false, message: "BUSINESS_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ================= ACCESS ================= */
    const accessDoc = await UserBusinessAccess.findOne({
      userId,
      businessId,
    })
      .lean()
      .exec();

    const safeAccess = Array.isArray(accessDoc)
      ? accessDoc[0]
      : accessDoc;

    if (!safeAccess) {
      return NextResponse.json(
        { success: false, message: "ACCESS_DENIED" },
        { status: 403 }
      );
    }

    /* ================= SAFE NORMALIZATION ================= */
    const safeModules = Array.isArray(
      (safeBusiness as any)?.modules
    )
      ? (safeBusiness as any).modules
      : [];

    const safeAccessKeys = Array.isArray(
      (safeAccess as any)?.accessKeys
    )
      ? (safeAccess as any).accessKeys
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
        message: err?.message || "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
