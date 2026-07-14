import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { logAction } from '@/lib/audit/logAction';
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";

function permissionErrorResponse(err: any) {
  return NextResponse.json(
    { error: err.message },
    { status: err.code === "FORBIDDEN" ? 403 : 401 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("roles", "view"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }

    await connectDB();
    const Role = mongoose.models.Role || (await import('@/models/Role')).default;
    const UserRole = mongoose.models.UserRole || (await import('@/models/UserRole')).default;

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const vendorId = searchParams.get('vendorId');

    // A vendor's 11 default roles (Owner/Manager/etc.) are only ever
    // generated on-demand -- previously only from the vendor's OWN
    // /vendor/staff page load (self-healing resync there), never from
    // here. That meant Admin > Users > Assign to Vendor showed an empty
    // role picker for any vendor whose Owner had never opened their staff
    // page yet, even though the vendor itself was fully active. Run the
    // same idempotent upsert here so Super Admin's picker is never empty
    // for an active vendor.
    if (vendorId && businessId && mongoose.Types.ObjectId.isValid(vendorId)) {
      const { createDefaultVendorRoles } = await import('@/core/access/vendorDefaultRoles.service');
      await createDefaultVendorRoles(vendorId, businessId).catch(() => {});
    }

    const query: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (businessId) query.businessId = businessId;
    // Was an exact vendorId match ONLY -- so Admin > Users > Assign to
    // Vendor's role picker could show nothing but the 11 auto-generated
    // vendor-default roles (VENDOR_OWNER/VENDOR_MANAGER/etc.), never any
    // custom role a Super Admin had built for that BUSINESS from
    // Admin > Access (those are saved with vendorId unset, since they're
    // business-wide, not tied to one specific vendor). A vendor's own
    // real access is the union of both: its own default set AND whatever
    // that business-wide roles this business has defined.
    if (vendorId) query.$or = [{ vendorId }, { vendorId: { $in: [null, undefined] } }];

    const roles = await Role.find(query).lean();

    const rolesWithCounts = await Promise.all(
      roles.map(async (role: Record<string, unknown>) => {
        const userCount = await UserRole.countDocuments({ roleId: role._id });
        return { ...role, userCount };
      })
    );

    return NextResponse.json({ roles: rolesWithCounts });
  } catch (error) {
    console.error('GET /api/admin/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("roles", "create"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }

    await connectDB();
    const Role = mongoose.models.Role || (await import('@/models/Role')).default;

    const body = await request.json();
    const { name, code, description, permissions, businessId } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    // Was checking uniqueness GLOBALLY (just `code`), not scoped to this
    // business -- the real unique index is {code, businessId, vendorId}
    // (see Role.ts), so this falsely blocked a second business from ever
    // creating its own role using a code some other business already used
    // (e.g. "MANAGER"), even though roles are meant to be independent per
    // business.
    const existing = await Role.findOne({
      code: code.toUpperCase(),
      businessId: businessId || null,
      vendorId: null,
      isDeleted: { $ne: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'A role with this code already exists for this business' }, { status: 409 });
    }

    const role = await Role.create({
      name,
      code: code.toUpperCase(),
      description,
      permissions: permissions || [],
      businessId: businessId || null,
      isDeleted: false,
    });

    logAction({
      action: "CREATE",
      entity: "Role",
      entityId: role._id?.toString(),
      after: role,
      req: request,
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("roles", "edit"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }

    await connectDB();
    const Role = mongoose.models.Role || (await import('@/models/Role')).default;

    const body = await request.json();
    const { id, name, description, permissions } = body;

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    const role = await Role.findByIdAndUpdate(
      id,
      { $set: { name, description, permissions } },
      { new: true }
    );

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    logAction({
      action: "UPDATE",
      entity: "Role",
      entityId: id,
      after: { name, description, permissions },
      req: request,
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error('PUT /api/admin/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
