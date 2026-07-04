import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import VendorProfile from "@/models/VendorProfile";
import Agreement from "@/models/Agreement";
import User from "@/models/User";
import BusinessMember, { BusinessMemberStatus } from "@/models/BusinessMember";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/vendors/[id]/finalize
 *
 * Step 4 of vendor onboarding: after the vendor has signed the partner
 * agreement, the admin verifies and gives FINAL approval. This:
 *   1. Verifies the linked agreement is fully signed
 *   2. Creates the vendor's login (User with role VENDOR) with a one-time
 *      temporary password (returned ONCE in this response for the admin to
 *      share securely)
 *   3. Creates the BusinessMember record (memberType VENDOR) so the login is
 *      scoped to the right business across all platforms (SSO included)
 *   4. Marks the vendor ACTIVE
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const h = await headers();
    const adminId = h.get("x-user-id");
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const vendor = await VendorProfile.findById(id);
    if (!vendor || vendor.isDeleted) {
      return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
    }

    if (["ACTIVE", "APPROVED"].includes(vendor.status)) {
      return NextResponse.json(
        { success: false, error: "Vendor is already approved" },
        { status: 400 }
      );
    }

    /* ── 1. Agreement must be signed ─────────────────────────────────── */
    if (!vendor.agreementId) {
      return NextResponse.json(
        { success: false, error: "No agreement linked — run the review/approve step first" },
        { status: 400 }
      );
    }
    const agreement = await (Agreement as any).findById(vendor.agreementId).lean();
    if (!agreement) {
      return NextResponse.json(
        { success: false, error: "Linked agreement not found" },
        { status: 400 }
      );
    }
    const SIGNED_STATES = ["SIGNED", "FULLY_SIGNED"];
    if (!SIGNED_STATES.includes(agreement.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Agreement is ${agreement.status} — the vendor must sign it before final approval`,
        },
        { status: 400 }
      );
    }

    /* ── 2. Create (or reuse) the vendor login ──────────────────────── */
    let user = await User.findOne({
      email: vendor.email,
      isDeleted: false,
    });

    let tempPassword: string | null = null;

    if (!user) {
      // 12-char URL-safe temporary password
      tempPassword = crypto.randomBytes(9).toString("base64url");
      const hashed = await bcryptjs.hash(tempPassword, 12);

      user = await User.create({
        name: vendor.contactPerson || vendor.companyName,
        email: vendor.email,
        password: hashed,
        phone: vendor.phone || undefined,
        role: "VENDOR",
        isActive: true,
        isEmailVerified: false,
        authProvider: "credentials",
        defaultBusinessId: vendor.businessId,
      });
    } else if (!user.isActive) {
      user.isActive = true;
      await user.save();
    }

    /* ── 3. Business membership (idempotent) ────────────────────────── */
    await BusinessMember.updateOne(
      { userId: user._id, businessId: vendor.businessId },
      {
        $set: {
          status: BusinessMemberStatus.ACTIVE,
          memberType: "VENDOR",
          invitedBy: adminId,
          isDeleted: false,
        },
        $setOnInsert: { isDefaultBusiness: true, joinedAt: new Date() },
      },
      { upsert: true }
    );

    /* ── 4. Activate the vendor ─────────────────────────────────────── */
    vendor.userId = user._id as any;
    vendor.status = "ACTIVE";
    vendor.isApproved = true;
    vendor.finalApprovedBy = adminId as any;
    vendor.finalApprovedAt = new Date();
    await vendor.save();

    return NextResponse.json({
      success: true,
      vendor,
      login: {
        email: vendor.email,
        // Shown exactly once — share it with the vendor over a secure channel.
        // Null when the user already existed (they keep their password).
        temporaryPassword: tempPassword,
        portalUrl: "/vendor",
      },
      message: tempPassword
        ? "Vendor approved and login created. Share the temporary password securely — it is shown only once."
        : "Vendor approved. An existing login with this email was linked to the vendor.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
