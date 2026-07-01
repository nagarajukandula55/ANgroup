import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";

/* ── Dynamic imports to avoid model recompilation ── */
async function getModels() {
  const mongoose = (await import("mongoose")).default;
  const VendorProfile =
    mongoose.models.VendorProfile ||
    (await import("@/models/VendorProfile")).default;
  const User =
    mongoose.models.User || (await import("@/models/User")).default;
  const Role =
    mongoose.models.Role || (await import("@/models/Role")).default;
  const UserRole =
    mongoose.models.UserRole ||
    (await import("@/models/UserRole")).default;
  const BusinessMember =
    mongoose.models.BusinessMember ||
    (await import("@/models/BusinessMember")).default;
  return { VendorProfile, User, Role, UserRole, BusinessMember, mongoose };
}

/* =========================================================
 * GET /api/vendors — List vendors for a business
 * =======================================================*/
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    if (!h.get("x-user-id"))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { VendorProfile } = await getModels();
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const search = searchParams.get("search");

    if (!businessId)
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });

    const query: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      isDeleted: { $ne: true },
    };

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await VendorProfile.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, vendors });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* =========================================================
 * POST /api/vendors — Onboard a vendor (creates user + profile)
 * =======================================================*/
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const requesterId = h.get("x-user-id");
    if (!requesterId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { VendorProfile, User, Role, UserRole, BusinessMember, mongoose } =
      await getModels();

    const body = await req.json();
    const {
      businessId,
      companyName,
      contactPerson,
      email,
      phone,
      address,
      gstNumber,
      password: customPassword,
    } = body;

    if (!businessId || !companyName) {
      return NextResponse.json(
        { error: "businessId and companyName are required" },
        { status: 400 }
      );
    }

    /* ── 1. Generate temp password ── */
    const tempPassword =
      customPassword ||
      Math.random().toString(36).slice(2, 8).toUpperCase() +
        Math.random().toString(36).slice(2, 6) +
        "@1";

    /* ── 2. Create or reuse user account (if email provided) ── */
    let user: Record<string, unknown> | null = null;
    let userCreated = false;

    if (email) {
      const existing = await User.findOne({ email, isDeleted: { $ne: true } }).lean();
      if (existing) {
        user = existing as Record<string, unknown>;
      } else {
        const hashed = await bcrypt.hash(tempPassword, 12);
        user = (await User.create({
          name: contactPerson || companyName,
          email,
          password: hashed,
          isActive: true,
          isEmailVerified: false,
          authProvider: "credentials",
          isDeleted: false,
        })) as unknown as Record<string, unknown>;
        userCreated = true;
      }

      /* ── 3. Assign VENDOR role ── */
      if (user && userCreated) {
        let roleDoc = await Role.findOne({ code: "VENDOR" }).lean();
        if (!roleDoc) {
          roleDoc = await Role.create({
            name: "Vendor",
            code: "VENDOR",
            description: "External vendor user",
            isSystem: false,
          });
        }
        await UserRole.findOneAndUpdate(
          { userId: (user as any)._id, roleId: (roleDoc as any)._id },
          { userId: (user as any)._id, roleId: (roleDoc as any)._id },
          { upsert: true }
        );

        /* ── 4. BusinessMember ── */
        await BusinessMember.findOneAndUpdate(
          { userId: (user as any)._id, businessId: new mongoose.Types.ObjectId(businessId) },
          {
            $set: {
              memberType: "VENDOR",
              status: "ACTIVE",
              isDefaultBusiness: true,
              invitedBy: new mongoose.Types.ObjectId(requesterId),
            },
            $setOnInsert: { joinedAt: new Date() },
          },
          { upsert: true }
        );
      }
    }

    /* ── 5. Generate vendorId ── */
    const count = await VendorProfile.countDocuments({
      businessId: new Types.ObjectId(businessId),
    });
    const vendorId = `VND-${String(count + 1).padStart(4, "0")}`;

    /* ── 6. Create VendorProfile ── */
    const vendor = await VendorProfile.create({
      businessId:    new Types.ObjectId(businessId),
      userId:        user ? (user as any)._id : undefined,
      vendorId,
      companyName,
      contactPerson,
      email,
      phone,
      address,
      gstNumber,
      status:        "PENDING",
      isApproved:    false,
      isDeleted:     false,
    });

    return NextResponse.json({
      success: true,
      vendor,
      /* Return credentials only when a new user account was created */
      ...(userCreated && email
        ? {
            credentials: {
              email,
              password:    tempPassword,
              loginUrl:    "/login",
              message:
                "Share these credentials with the vendor. They should change the password on first login.",
            },
          }
        : {}),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
