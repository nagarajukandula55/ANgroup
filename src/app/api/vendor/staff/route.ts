import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import VendorProfile from "@/models/VendorProfile";
import BusinessMember, { BusinessMemberStatus, BusinessMemberType } from "@/models/BusinessMember";
import User from "@/models/User";
import Role from "@/models/Role";
import UserRole from "@/models/UserRole";
import { logAction } from "@/lib/audit/logAction";

/**
 * Vendor-side staff management. Completes the hierarchy requested:
 * AN Group > Businesses (Tenants) > Vendors under respective businesses >
 * Warehouses under vendors > Staff.
 *
 * Any existing user can join a vendor's team as staff. They're identified
 * by their `username` (their "vendor code" — the same unique, public user
 * ID collected at signup, see auth/register/route.ts). This is deliberately
 * NOT email — a username is meant to be shareable/quotable the way a
 * "vendor code" would be, without exposing the person's email address.
 *
 * Note: the actual per-role PERMISSIONS a `vendorRole` grants (what a
 * "Warehouse Manager" vs a "Picker" can see/do inside the vendor portal)
 * are intentionally NOT enforced yet at this layer — vendorRole is stored
 * as a free-form label the vendor owner defines, and enforcing scoped UI
 * access per role is follow-up work once the vendor-portal Products/
 * Orders/BOM pages exist to actually gate.
 */

async function requireVendorOwner(userId: string | null) {
  if (!userId) return null;
  const vendor = await VendorProfile.findOne({ userId, isDeleted: { $ne: true } }).lean();
  return vendor;
}

export async function GET() {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    const vendor = await requireVendorOwner(userId);
    if (!vendor) {
      return NextResponse.json({ success: false, error: "Only a vendor account can view its own staff" }, { status: 403 });
    }

    const members = await BusinessMember.find({ vendorId: vendor._id, isDeleted: { $ne: true } })
      .populate("userId", "name email username")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      staff: members,
      // So the staff-creation UI can show only the memberType roles
      // relevant to which facilities this vendor actually has enabled
      // (Store Front/Service Center → CCO/ENGINEER/CENTRE_MANAGER,
      // Warehouse → HELPER/PACKER/SCM — see BusinessMember.ts).
      vendor: {
        enableStoreFront: !!(vendor as any).enableStoreFront,
        enableServiceCenter: !!(vendor as any).enableServiceCenter,
        enableWarehouse: !!(vendor as any).enableWarehouse,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/** Body: { username: string, vendorRole: string, memberType?: string, roleCode?: string }
 *
 * roleCode (optional) is the ACTUAL permission grant: one of this vendor's
 * own fixed default roles (VENDOR_OWNER/VENDOR_MANAGER/etc., generated at
 * approval time -- see core/access/vendorDefaultRoles.service.ts). The
 * lookup is deliberately scoped to {businessId: vendor.businessId, vendorId:
 * vendor._id} -- never a global Role.findOne({code}) -- so a vendor can
 * only ever hand out roles from its own generated 11, never invent a new
 * one or reach another vendor's roles. vendorRole above stays a free-text
 * display label; roleCode is what actually grants access. */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    const vendor = await requireVendorOwner(userId);
    if (!vendor) {
      return NextResponse.json({ success: false, error: "Only a vendor account can add its own staff" }, { status: 403 });
    }
    if (!vendor.businessId) {
      return NextResponse.json({ success: false, error: "Vendor is not yet assigned to a business" }, { status: 400 });
    }

    const body = await req.json();
    const { username, vendorRole, memberType, roleCode } = body;
    if (!username || !String(username).trim()) {
      return NextResponse.json({ success: false, error: "The staff member's user ID (vendor code) is required" }, { status: 400 });
    }
    if (!vendorRole || !String(vendorRole).trim()) {
      return NextResponse.json({ success: false, error: "A role must be assigned to this staff member" }, { status: 400 });
    }

    const targetUser = await User.findOne({
      username: String(username).toLowerCase().trim(),
      isDeleted: { $ne: true },
    }).lean();
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "No user found with that ID" }, { status: 404 });
    }

    // Must already be Super-Admin-attached to this vendor's team before a
    // role can be granted -- the vendor can hand out access, it can't pull
    // someone onto its team unilaterally (that's Super Admin's call via
    // /api/admin/users/[id]/promote).
    const existingMembership = await BusinessMember.findOne({
      userId: (targetUser as any)._id,
      businessId: vendor.businessId,
      vendorId: vendor._id,
      isDeleted: { $ne: true },
    }).lean();
    if (roleCode && !existingMembership) {
      return NextResponse.json(
        { success: false, error: "This user must be attached to your team by Super Admin before a role can be granted" },
        { status: 403 }
      );
    }

    let grantedRoleDoc = null;
    if (roleCode) {
      grantedRoleDoc = await Role.findOne({
        code: String(roleCode).toUpperCase(),
        businessId: vendor.businessId,
        vendorId: vendor._id,
      });
      if (!grantedRoleDoc) {
        return NextResponse.json(
          { success: false, error: "That role does not belong to your vendor's default role set" },
          { status: 400 }
        );
      }
    }

    // Store Front/Service Center staff roles and Warehouse staff roles,
    // in addition to the legacy VENDOR_* prefixed types — see
    // BusinessMember.ts's memberType enum.
    const ALLOWED_STAFF_MEMBER_TYPES: string[] = [
      "CCO", "ENGINEER", "CENTRE_MANAGER", "HELPER", "PACKER", "SCM",
    ];
    const isAllowedMemberType =
      memberType &&
      (String(memberType).startsWith("VENDOR") || ALLOWED_STAFF_MEMBER_TYPES.includes(String(memberType)));

    const member = await BusinessMember.findOneAndUpdate(
      { userId: targetUser._id, businessId: vendor.businessId, vendorId: vendor._id },
      {
        $set: {
          status: BusinessMemberStatus.ACTIVE,
          memberType: (isAllowedMemberType ? memberType : "VENDOR_HELPER") as BusinessMemberType,
          vendorRole: String(vendorRole).trim(),
          invitedBy: userId,
          isDeleted: false,
        },
        $setOnInsert: { joinedAt: new Date(), isDefaultBusiness: false },
      },
      { upsert: true, new: true }
    );

    if (grantedRoleDoc) {
      await UserRole.updateOne(
        { userId: (targetUser as any)._id, roleId: grantedRoleDoc._id },
        {
          $setOnInsert: {
            userId: (targetUser as any)._id,
            roleId: grantedRoleDoc._id,
            businessId: vendor.businessId,
            assignedBy: userId,
          },
        },
        { upsert: true }
      );
    }

    logAction({
      action: "CREATE",
      entity: "BusinessMember",
      entityId: member._id?.toString(),
      after: { userId: targetUser._id, vendorId: vendor._id, vendorRole },
      req,
      actor: { id: userId, businessId: vendor.businessId?.toString() },
    });

    return NextResponse.json({ success: true, staff: member });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
