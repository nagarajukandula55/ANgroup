import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import VendorStaffSlot from "@/models/VendorStaffSlot";
import VendorProfile from "@/models/VendorProfile";
import BusinessMember, { BusinessMemberStatus } from "@/models/BusinessMember";
import User from "@/models/User";
import Role from "@/models/Role";
import UserRole from "@/models/UserRole";
import { createDefaultVendorRoles } from "@/core/access/vendorDefaultRoles.service";
import { logAction } from "@/lib/audit/logAction";

// Designation -> the vendor-scoped Role code createDefaultVendorRoles()
// provisions for this vendor (see core/access/vendorDefaultRoles.service.ts's
// VENDOR_ROLE_DEFS). Without this mapping, tagging a user to a slot only
// ever created a BusinessMember row -- getEnrichedSession() resolves
// permissions from UserRole, not BusinessMember.vendorRole, so a
// slot-tagged user's session.permissions stayed permanently empty. That
// produced two contradictory-looking symptoms at once: the sidebar's
// client-side STATIC_MODULES fallback kicked in (api/ui/sidebar returning
// zero visible modules for an empty-permission session made the client
// keep its "show everything" default instead of the real filtered list),
// while every actual page-level requirePermission() check correctly 403'd
// since the user genuinely had no permissions.
const DESIGNATION_TO_ROLE_CODE: Record<string, string> = {
  MANAGER: "VENDOR_MANAGER",
  CCO: "VENDOR_FRONT_OFFICE",
  ENGINEER: "VENDOR_ENGINEER",
  WAREHOUSE_MANAGER: "VENDOR_WAREHOUSE_MANAGER",
  TELECALLER: "VENDOR_FRONT_OFFICE",
};

/**
 * POST /api/admin/vendor-staff-slots/[id]/activate — Super Admin only,
 * per explicit requirement ("super admin will enable them when required
 * and tag user ID to make user live"). Body: { username }. Looks up the
 * existing user by their public username (same "vendor code" pattern
 * /api/admin/vendor-staff already uses), links them as this designation's
 * BusinessMember, and marks the slot ACTIVE.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const h = await headers();
    const callerId = h.get("x-user-id");
    const callerIsSuperAdmin = h.get("x-is-super-admin") === "true";
    if (!callerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!callerIsSuperAdmin) {
      return NextResponse.json({ success: false, error: "Only Super Admins can activate a staff slot" }, { status: 403 });
    }

    const { id } = await context.params;
    const { username } = await req.json();
    if (!username?.trim()) {
      return NextResponse.json({ success: false, error: "username is required" }, { status: 400 });
    }

    const slot = await VendorStaffSlot.findById(id);
    if (!slot) {
      return NextResponse.json({ success: false, error: "Slot not found" }, { status: 404 });
    }
    if (slot.status === "ACTIVE") {
      return NextResponse.json({ success: false, error: "This slot is already active" }, { status: 409 });
    }

    const vendor = await VendorProfile.findById(slot.vendorId).lean();
    if (!vendor) {
      return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
    }

    const targetUser = await User.findOne({ username: username.toLowerCase().trim(), isDeleted: { $ne: true } }).lean();
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "No user found with that ID" }, { status: 404 });
    }

    // Designation -> BusinessMember.memberType, reusing the existing
    // vendor-flavored enum (see core/constants/businessMemberTypes.ts).
    const MEMBER_TYPE: Record<string, string> = {
      CCO: "CCO",
      ENGINEER: "ENGINEER",
      WAREHOUSE_MANAGER: "VENDOR_WAREHOUSE",
      TELECALLER: "VENDOR_HELPER",
    };

    const member = await BusinessMember.findOneAndUpdate(
      { userId: targetUser._id, businessId: vendor.businessId, vendorId: vendor._id },
      {
        $set: {
          status: BusinessMemberStatus.ACTIVE,
          memberType: MEMBER_TYPE[slot.designation] || "VENDOR_HELPER",
          vendorRole: slot.designation,
          invitedBy: callerId,
          isDeleted: false,
        },
        $setOnInsert: { joinedAt: new Date(), isDefaultBusiness: false },
      },
      { upsert: true, new: true }
    );

    slot.status = "ACTIVE";
    slot.userId = targetUser._id as any;
    slot.activatedAt = new Date();
    await slot.save();

    // Grant the matching vendor-scoped Role so this user's session
    // actually resolves real permissions -- idempotent, safe to call even
    // if this vendor's default role set was already provisioned at
    // finalize time.
    await createDefaultVendorRoles(String(vendor._id), String(vendor.businessId)).catch(() => {});
    const roleCode = DESIGNATION_TO_ROLE_CODE[slot.designation];
    if (roleCode) {
      const role = await Role.findOne({
        code: roleCode,
        businessId: vendor.businessId,
        vendorId: vendor._id,
      }).lean();
      if (role) {
        await UserRole.updateOne(
          { userId: targetUser._id, roleId: (role as any)._id },
          { $setOnInsert: { userId: targetUser._id, roleId: (role as any)._id, businessId: vendor.businessId } },
          { upsert: true }
        );
      }
    }

    logAction({
      action: "UPDATE",
      entity: "VendorStaffSlot",
      entityId: slot._id?.toString(),
      after: { status: "ACTIVE", userId: targetUser._id, designation: slot.designation },
      req,
      actor: { id: callerId },
    });

    return NextResponse.json({ success: true, slot, member });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
