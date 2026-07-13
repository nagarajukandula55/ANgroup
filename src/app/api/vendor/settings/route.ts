/**
 * GET/PATCH /api/vendor/settings — business-level settings a vendor
 * Owner or Manager (not any other staff role) can see/change themselves,
 * without needing Super Admin. Currently just
 * Business.inventorySerialized (see models/Business.ts's comment) --
 * whether workorder part selection checks real Inventory stock or just
 * pulls from the Service Center BOM price list.
 */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import VendorProfile from "@/models/VendorProfile";
import BusinessMember from "@/models/BusinessMember";
import Business from "@/models/Business";
import Role from "@/models/Role";
import UserRole from "@/models/UserRole";

async function resolveOwnerOrManagerVendor(userId: string | null) {
  if (!userId) return null;
  // The literal Owner (VendorProfile.userId, set at finalize) always
  // qualifies. Otherwise, holding the real VENDOR_MANAGER UserRole for a
  // vendor does too -- "Owner or Manager" per explicit direction. Checked
  // via the actual granted Role/UserRole, not BusinessMember.vendorRole
  // (a free-text display label the vendor types in at grant time, e.g.
  // "Manager" or a custom name -- not reliable to match against).
  const ownedVendor = await VendorProfile.findOne({ userId, isDeleted: { $ne: true } }).lean();
  if (ownedVendor) return ownedVendor;

  const membership = await BusinessMember.findOne({
    userId,
    vendorId: { $ne: null },
    status: "ACTIVE",
  }).lean();
  if (!membership?.vendorId) return null;

  const managerRole = await Role.findOne({
    code: "VENDOR_MANAGER",
    businessId: membership.businessId,
    vendorId: membership.vendorId,
  }).lean();
  if (!managerRole) return null;

  const hasManagerRole = await UserRole.exists({ userId, roleId: (managerRole as any)._id });
  if (!hasManagerRole) return null;

  return VendorProfile.findById(membership.vendorId).lean();
}

export async function GET() {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    const vendor = await resolveOwnerOrManagerVendor(userId);
    if (!vendor) {
      return NextResponse.json({ success: false, error: "Only a vendor Owner or Manager can view these settings" }, { status: 403 });
    }
    if (!(vendor as any).businessId) {
      return NextResponse.json({ success: false, error: "Vendor is not yet assigned to a business" }, { status: 400 });
    }

    const business = await Business.findById((vendor as any).businessId).select("inventorySerialized").lean();
    return NextResponse.json({
      success: true,
      inventorySerialized: Boolean((business as any)?.inventorySerialized),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    const vendor = await resolveOwnerOrManagerVendor(userId);
    if (!vendor) {
      return NextResponse.json({ success: false, error: "Only a vendor Owner or Manager can change these settings" }, { status: 403 });
    }
    if (!(vendor as any).businessId) {
      return NextResponse.json({ success: false, error: "Vendor is not yet assigned to a business" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    if (typeof body.inventorySerialized !== "boolean") {
      return NextResponse.json({ success: false, error: "inventorySerialized (boolean) is required" }, { status: 400 });
    }

    await Business.updateOne(
      { _id: (vendor as any).businessId },
      { $set: { inventorySerialized: body.inventorySerialized } }
    );

    return NextResponse.json({ success: true, inventorySerialized: body.inventorySerialized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
