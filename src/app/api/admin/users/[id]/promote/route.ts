import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { getEnrichedSession } from '@/lib/auth/session-enriched';
import { logAction } from '@/lib/audit/logAction';
import User from '@/models/User';
import Role from '@/models/Role';
import UserRole from '@/models/UserRole';
import BusinessMember, { BusinessMemberStatus } from '@/models/BusinessMember';
import VendorProfile from '@/models/VendorProfile';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/users/[id]/promote — the ONLY way a user's floor access
 * (CUSTOMER_SHOPNATIVE / CUSTOMER_ANGROUP / any other minimal role) gets
 * elevated. Super-Admin-only (checked via session.isSuperAdmin directly,
 * not just a permission code, since no other actor may ever call this).
 *
 * Additive: this never removes the user's existing floor role. A later
 * demotion can never leave someone with zero roles, since the floor is
 * always still there.
 *
 * body: { track: 'AN_EMPLOYEE' | 'VENDOR_TEAM', roleCode?, businessId?, vendorId? }
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only Super Admin can promote a user out of base access' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
    }

    const targetUser = await User.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { track, roleCode, businessId, vendorId } = body;

    if (track === 'AN_EMPLOYEE') {
      const requested = String(roleCode || '').toUpperCase();
      if (!['SUPER_ADMIN', 'AN_ADMIN'].includes(requested)) {
        return NextResponse.json(
          { success: false, error: 'roleCode must be SUPER_ADMIN or AN_ADMIN for the AN_EMPLOYEE track' },
          { status: 400 }
        );
      }
      // Granting SUPER_ADMIN itself requires the caller already be one --
      // already enforced above (this whole route is super-admin-only), but
      // kept explicit since it's the highest-consequence grant here.

      const roleDoc = await Role.findOne({ code: requested, businessId: null, vendorId: null });
      if (!roleDoc) {
        return NextResponse.json(
          { success: false, error: `Role "${requested}" is not configured.` },
          { status: 400 }
        );
      }

      await UserRole.updateOne(
        { userId: targetUser._id, roleId: roleDoc._id },
        { $setOnInsert: { userId: targetUser._id, roleId: roleDoc._id } },
        { upsert: true }
      );

      if (requested === 'SUPER_ADMIN') {
        targetUser.role = 'SUPER_ADMIN' as any;
      } else if (targetUser.role === 'CUSTOMER') {
        targetUser.role = 'ADMIN' as any;
      }
      await targetUser.save();

      logAction({
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        after: { promoted: 'AN_EMPLOYEE', roleCode: requested },
        req,
        actor: { id: session.user.id },
      });

      return NextResponse.json({ success: true, message: `Promoted to ${requested}` });
    }

    if (track === 'VENDOR_TEAM') {
      if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
        return NextResponse.json({ success: false, error: 'businessId is required' }, { status: 400 });
      }
      if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
        return NextResponse.json({ success: false, error: 'vendorId is required' }, { status: 400 });
      }
      // A user must never end up attached to a vendor's team with zero
      // real access -- roleCode is now required, not optional, so this
      // route can no longer produce that dangling state itself. (The
      // vendor's own Owner/Manager can still grant additional/different
      // roles later from Vendor Portal > Staff.)
      if (!roleCode || !String(roleCode).trim()) {
        return NextResponse.json(
          { success: false, error: 'roleCode is required — a user cannot be attached to a vendor team with no role/access' },
          { status: 400 }
        );
      }

      const vendor = await VendorProfile.findOne({
        _id: vendorId,
        businessId,
        isDeleted: { $ne: true },
      }).lean<any>();
      if (!vendor) {
        return NextResponse.json(
          { success: false, error: 'Vendor not found under this business' },
          { status: 404 }
        );
      }
      if (vendor.status !== 'ACTIVE') {
        return NextResponse.json(
          { success: false, error: 'Vendor is not active yet' },
          { status: 400 }
        );
      }

      // Additive: attach the user to this vendor's team so they become
      // visible on the vendor's own team-management screen.
      await BusinessMember.updateOne(
        { userId: targetUser._id, businessId, vendorId },
        {
          $set: { status: BusinessMemberStatus.ACTIVE },
          $setOnInsert: {
            userId: targetUser._id,
            businessId,
            vendorId,
            memberType: 'VENDOR',
            isDefaultBusiness: false,
          },
        },
        { upsert: true }
      );

      // Super Admin can also directly grant a role here now (originally
      // this track only attached the user, leaving them with zero
      // permissions until the vendor separately granted one via
      // /api/vendor/staff -- in practice that left people attached but
      // stuck with no access for a while, or forgotten entirely). Scoped
      // the exact same way the vendor's own grant flow scopes it
      // ({businessId, vendorId}) so Super Admin can only hand out this
      // vendor's own generated role set, never invent one or reach
      // another vendor's roles.
      let grantedRoleCode: string | null = null;
      if (roleCode) {
        const grantedRoleDoc = await Role.findOne({
          code: String(roleCode).toUpperCase(),
          businessId,
          vendorId,
        });
        if (!grantedRoleDoc) {
          return NextResponse.json(
            { success: false, error: 'That role does not belong to this vendor\'s default role set' },
            { status: 400 }
          );
        }
        await UserRole.updateOne(
          { userId: targetUser._id, roleId: grantedRoleDoc._id },
          {
            $setOnInsert: {
              userId: targetUser._id,
              roleId: grantedRoleDoc._id,
              businessId,
              assignedBy: session.user.id,
            },
          },
          { upsert: true }
        );
        grantedRoleCode = grantedRoleDoc.code;
      }

      logAction({
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        after: { promoted: 'VENDOR_TEAM', businessId, vendorId, roleCode: grantedRoleCode },
        req,
        actor: { id: session.user.id },
      });

      return NextResponse.json({
        success: true,
        message: grantedRoleCode ? `Attached to vendor team and granted ${grantedRoleCode}` : 'Attached to vendor team',
      });
    }

    return NextResponse.json(
      { success: false, error: 'track must be AN_EMPLOYEE or VENDOR_TEAM' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('POST /api/admin/users/[id]/promote error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
