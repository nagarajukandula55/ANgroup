import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User, { AuthProvider } from "@/models/User";
import BusinessMember, { BusinessMemberStatus, BusinessMemberType } from "@/models/BusinessMember";
import Role from "@/models/Role";
import UserRole from "@/models/UserRole";
import { logAction } from "@/lib/audit/logAction";
import { generateScopedDocumentNumber } from "@/core/numbering/numberingService";
import { grantVendorStaffAccess } from "@/core/access/vendorAccess.service";
import { resolveOwnerOrManagerVendor as requireVendorOwnerOrManager } from "@/core/access/vendorAccess.service";

const SALT_ROUNDS = 12;

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomFillSync(new Uint8Array(10)))
    .map((b) => alphabet[b % alphabet.length])
    .join("");
}

// Modules a given memberType implies real (permission-granting) access to,
// on top of whatever roleCode/isManager grant is passed explicitly — same
// mapping used in /api/vendor/staff for the existing-user "Add Staff" flow,
// so a self-service-created Engineer/CCO shows up in the same assignment
// pickers (e.g. job-sheet engineer assignment) without a separate manual
// Team & Access step.
const MEMBER_TYPE_IMPLIED_MODULES: Record<string, string[]> = {
  ENGINEER: ["crm_calls", "crm_jobsheets"],
  CCO: ["crm_calls"],
  CENTRE_MANAGER: ["crm_calls", "crm_jobsheets"],
};

/**
 * POST /api/vendor/staff/create — lets a vendor's Owner/Manager onboard a
 * BRAND NEW person directly, instead of requiring Super Admin to first
 * attach an already-registered platform account (the /api/vendor/staff
 * flow, which only ever looks an existing user up by username). Per
 * explicit direction: vendors manage their own team end-to-end.
 *
 * Creates a real User row so the person can log in, but deliberately:
 *  - never grants any CUSTOMER floor role (register/route.ts's normal
 *    signup path is what does that) -- this account starts with ONLY
 *    whatever vendor-staff access is granted below, nothing storefront-
 *    facing, so it can't casually double as a customer login.
 *  - uses a vendor-scoped login code (`{vendor.vendorId}-{seq}`, e.g.
 *    "VEN-0001-0007") as BOTH the username and the employee code, instead
 *    of letting the vendor pick a username that might collide with an
 *    unrelated existing account -- this is what "add them to the DB with
 *    a Vendor ID-sequence code" and "should not use another system" mean
 *    in practice: the identity is minted fresh and scoped to this vendor,
 *    never reused from/aliased to any pre-existing account.
 *
 * Body: { name: string, email?: string, phone?: string, vendorRole: string,
 *         memberType: string, roleCode?: string }
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    const vendor = await requireVendorOwnerOrManager(userId);
    if (!vendor) {
      return NextResponse.json({ success: false, error: "Only a vendor's Owner or Manager can add its own staff" }, { status: 403 });
    }
    if (!vendor.businessId) {
      return NextResponse.json({ success: false, error: "Vendor is not yet assigned to a business" }, { status: 400 });
    }

    const body = await req.json();
    const { name, email, phone, vendorRole, memberType, roleCode } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }
    if (!vendorRole || !String(vendorRole).trim()) {
      return NextResponse.json({ success: false, error: "A role label is required" }, { status: 400 });
    }

    // Clear, specific conflict messages instead of a raw duplicate-key
    // error -- the vendor is creating someone they believe is brand new,
    // so a generic "already exists" is actively misleading here.
    if (email) {
      const existingEmail = await User.findOne({ email: String(email).toLowerCase().trim(), isDeleted: { $ne: true } }).lean();
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: "A user with this email already exists on the platform — use Add Staff (by username) instead if this is the same person." },
          { status: 409 }
        );
      }
    }

    const roles = await Role.find({ businessId: vendor.businessId, vendorId: vendor._id, status: "ACTIVE" }).lean();
    let grantedRoleDoc = null;
    if (roleCode) {
      grantedRoleDoc = roles.find((r: any) => r.code === String(roleCode).toUpperCase());
      if (!grantedRoleDoc) {
        return NextResponse.json(
          { success: false, error: "That role does not belong to your vendor's own role set" },
          { status: 400 }
        );
      }
    }

    // Vendor-scoped, human-readable login code: "{vendor.vendorId}-{seq}",
    // sequence resets per-vendor (scopeKey = vendor._id, not businessId or
    // a global counter) so every vendor's numbering starts fresh.
    const { sequence } = await generateScopedDocumentNumber(String(vendor._id), "EMPLOYEE", String(vendor.businessId));
    const employeeCode = `${vendor.vendorId}-${String(sequence).padStart(4, "0")}`;

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const newUser = await User.create({
      name: String(name).trim(),
      email: email ? String(email).toLowerCase().trim() : `${employeeCode.toLowerCase()}@staff.local`,
      username: employeeCode.toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      password: hashedPassword,
      role: "CUSTOMER",
      isActive: true,
      isEmailVerified: false,
      authProvider: AuthProvider.CREDENTIALS,
      isDeleted: false,
      mustChangePassword: true,
    });

    const ALLOWED_STAFF_MEMBER_TYPES: string[] = ["CCO", "ENGINEER", "CENTRE_MANAGER", "HELPER", "PACKER", "SCM"];
    const isAllowedMemberType =
      memberType && (String(memberType).startsWith("VENDOR") || ALLOWED_STAFF_MEMBER_TYPES.includes(String(memberType)));

    const member = await BusinessMember.create({
      userId: newUser._id,
      businessId: vendor.businessId,
      vendorId: vendor._id,
      status: BusinessMemberStatus.ACTIVE,
      memberType: (isAllowedMemberType ? memberType : "VENDOR_HELPER") as BusinessMemberType,
      vendorRole: String(vendorRole).trim(),
      invitedBy: userId,
      isDefaultBusiness: false,
      isDeleted: false,
      joinedAt: new Date(),
    });

    if (grantedRoleDoc) {
      await UserRole.updateOne(
        { userId: newUser._id, roleId: (grantedRoleDoc as any)._id },
        { $setOnInsert: { userId: newUser._id, roleId: (grantedRoleDoc as any)._id, businessId: vendor.businessId, assignedBy: userId } },
        { upsert: true }
      );
    }

    const impliedModules = MEMBER_TYPE_IMPLIED_MODULES[String(memberType)];
    if (impliedModules) {
      await grantVendorStaffAccess({
        userId: String(newUser._id),
        businessId: String(vendor.businessId),
        vendorId: String(vendor._id),
        modules: impliedModules,
        grantedBy: userId || undefined,
      });
    }

    logAction({
      action: "CREATE",
      entity: "BusinessMember",
      entityId: member._id?.toString(),
      after: { userId: newUser._id, vendorId: vendor._id, vendorRole, employeeCode, selfServiceCreated: true },
      req,
      actor: { id: userId, businessId: vendor.businessId?.toString() },
    });

    return NextResponse.json({
      success: true,
      staff: member,
      employeeCode,
      loginUsername: employeeCode.toLowerCase(),
      temporaryPassword: tempPassword,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
