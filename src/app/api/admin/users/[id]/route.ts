import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { logAction } from "@/lib/audit/logAction";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";
// Required for .populate(...) below -- model must be registered before populate can resolve it.
import "@/models/Role";
import "@/models/User";

const ASSIGNABLE_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'VENDOR', 'CUSTOMER'];

function permissionErrorResponse(err: any) {
  return NextResponse.json(
    { error: err.message },
    { status: err.code === "FORBIDDEN" ? 403 : 401 }
  );
}

async function getModels() {
  const User = mongoose.models.User || (await import('@/models/User')).default;
  const Role = mongoose.models.Role || (await import('@/models/Role')).default;
  const UserRole = mongoose.models.UserRole || (await import('@/models/UserRole')).default;
  const EmployeeProfile = mongoose.models.EmployeeProfile || (await import('@/models/EmployeeProfile')).default;
  const VendorProfile = mongoose.models.VendorProfile || (await import('@/models/VendorProfile')).default;
  return { User, Role, UserRole, EmployeeProfile, VendorProfile };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("users", "view"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }

    await connectDB();
    const { id } = await params;
    const { User, UserRole, EmployeeProfile, VendorProfile } = await getModels();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await User.findOne({ _id: id, isDeleted: { $ne: true } })
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRoles = await UserRole.find({ userId: id }).populate('roleId').lean();
    const roles = userRoles.map((ur: Record<string, unknown>) => ur.roleId);

    const employeeProfile = await EmployeeProfile.findOne({
      userId: id,
      isDeleted: { $ne: true },
    })
      .populate('reportingTo', 'name email')
      .lean();

    const vendorProfile = await VendorProfile.findOne({
      userId: id,
      isDeleted: { $ne: true },
    }).lean();

    return NextResponse.json({ user: { ...user, roles, employeeProfile, vendorProfile } });
  } catch (error) {
    console.error('GET /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("users", "edit"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }

    await connectDB();
    const { id } = await params;
    const { User, Role, UserRole, EmployeeProfile, VendorProfile } = await getModels();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, password, status, isActive, role, employeeData, vendorData } = body;

    // Was letting `role` be set to ANY string (including SUPER_ADMIN) with
    // no escalation guard -- same anti-escalation rule as api/admin/users
    // POST and api/staff/create now applies here too.
    if (role) {
      const requestedRole = String(role).toUpperCase();
      if (requestedRole === 'SUPER_ADMIN' && !session.isSuperAdmin) {
        return NextResponse.json(
          { error: 'Only Super Admins can grant the Super Admin role' },
          { status: 403 }
        );
      }
      if (requestedRole !== 'SUPER_ADMIN' && !ASSIGNABLE_ROLES.includes(requestedRole)) {
        return NextResponse.json(
          { error: `role must be one of: ${['SUPER_ADMIN', ...ASSIGNABLE_ROLES].join(', ')}` },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name)     updateData.name = name;
    if (email)    updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 12);
    // The flat legacy User.role field is what actually drives
    // x-is-super-admin at login (see api/admin/users/route.ts's own
    // comment on this) -- was never actually updated here, only the
    // Role/UserRole join rows below, so changing a user's role through
    // this route silently never took effect at login time.
    if (role) {
      const requestedRole = String(role).toUpperCase();
      updateData.role = requestedRole === 'SUPER_ADMIN' || requestedRole === 'ADMIN' ? requestedRole : 'CUSTOMER';
    }

    // Handle status toggle — User schema uses `isActive` (boolean), not `status` (string)
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    } else if (status === 'ACTIVE') {
      updateData.isActive = true;
    } else if (status === 'INACTIVE') {
      updateData.isActive = false;
    }

    const user = await User.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update role if provided
    if (role) {
      let roleDoc = await Role.findOne({ code: role.toUpperCase() });
      if (!roleDoc) {
        roleDoc = await Role.create({ name: role, code: role.toUpperCase(), description: role, isSystem: false });
      }
      // Replace existing user role
      await UserRole.deleteMany({ userId: id });
      await UserRole.create({ userId: id, roleId: roleDoc._id });
    }

    // Update employee profile if provided
    if (employeeData) {
      await EmployeeProfile.findOneAndUpdate(
        { userId: id },
        { $set: employeeData },
        { new: true, upsert: false }
      );
    }

    // Update vendor profile if provided
    if (vendorData) {
      await VendorProfile.findOneAndUpdate(
        { userId: id },
        { $set: vendorData },
        { new: true, upsert: false }
      );
    }

    // Re-fetch enriched user
    const userRoles = await UserRole.find({ userId: id }).populate('roleId').lean();
    const roles = userRoles.map((ur: Record<string, unknown>) => ur.roleId);

    logAction({
      action: "UPDATE",
      entity: "User",
      entityId: id,
      after: updateData,
      req: request,
    });

    return NextResponse.json({ user: { ...user.toObject(), roles } });
  } catch (error) {
    console.error('PUT /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("users", "delete"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }

    await connectDB();
    const { id } = await params;
    const { User } = await getModels();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await User.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, isActive: false } },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    logAction({
      action: "DELETE",
      entity: "User",
      entityId: id,
      req: request,
    });

    return NextResponse.json({ message: 'User deleted successfully', user });
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
