import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { bootstrapBusiness } from "@/services/businessBootstrap.service";
import BusinessMember, { BusinessMemberStatus } from "@/models/BusinessMember";

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();

    if (!body?.name || !String(body.name).trim()) {
      return NextResponse.json(
        { success: false, message: "Business name is required" },
        { status: 400 }
      );
    }

    const business = await bootstrapBusiness(body);

    // Link the creator to the new business. Without this membership the
    // business never appears in a non-super-admin creator's business list
    // (/api/auth/me filters by ACTIVE BusinessMember), so creation looked
    // like it "did nothing" even when it succeeded.
    const existingMemberships = await BusinessMember.countDocuments({
      userId,
      isDeleted: false,
    });
    await BusinessMember.create({
      userId,
      businessId: business._id,
      status: BusinessMemberStatus.ACTIVE,
      memberType: "OWNER",
      isDefaultBusiness: existingMemberships === 0,
    });

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (err: any) {
    // Duplicate key (businessCode / tenantKey) → friendly message instead
    // of a raw Mongo error.
    if (err?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A business with this code already exists — try a different name/code.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: err.message || "Failed to create business" },
      { status: 500 }
    );
  }
}
