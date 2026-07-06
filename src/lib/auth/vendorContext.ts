import VendorProfile, { IVendorProfile } from "@/models/VendorProfile";
import BusinessMember from "@/models/BusinessMember";

/**
 * Resolves which vendor a logged-in user should be scoped to when hitting
 * a /vendor/* or /api/vendor-products* endpoint — covering BOTH:
 *   1. The vendor OWNER (VendorProfile.userId === the caller) — the
 *      original, only-supported case until now.
 *   2. Vendor STAFF (a BusinessMember with vendorId set, added either by
 *      the vendor owner via /api/vendor/staff or by a super admin via
 *      /api/admin/vendor-staff) — this case was silently unsupported: every
 *      vendor-scoped route only ever checked VendorProfile.findOne({userId}),
 *      so a staff member could log in (their SSO token already carries
 *      vendorMemberships — see sso/token/route.ts) but every vendor
 *      endpoint (products, orders, warehouses, BOM, dashboard, statement,
 *      payout account) returned 403/empty for them. This helper is the
 *      single place that now recognizes both, so all those routes see
 *      staff correctly without duplicating the lookup logic per-file.
 *
 * Returns null if the caller is neither a vendor owner nor active staff of
 * any vendor — callers should treat that as "not a vendor" and fall back
 * to their existing business-scoped behavior (unchanged).
 */
export async function resolveVendorContext(
  userId: string | null | undefined
): Promise<{ vendor: IVendorProfile; role: "OWNER" | "STAFF"; vendorRole: string | null } | null> {
  if (!userId) return null;

  const owned = await VendorProfile.findOne({ userId, isDeleted: { $ne: true } });
  if (owned) {
    return { vendor: owned, role: "OWNER", vendorRole: null };
  }

  const membership = await BusinessMember.findOne({
    userId,
    vendorId: { $ne: null },
    isDeleted: { $ne: true },
    status: "ACTIVE",
  }).lean();
  if (!membership?.vendorId) return null;

  const vendor = await VendorProfile.findOne({
    _id: membership.vendorId,
    isDeleted: { $ne: true },
  });
  if (!vendor) return null;

  return { vendor, role: "STAFF", vendorRole: (membership as any).vendorRole || null };
}
