import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Dynamic imports to avoid model recompilation
async function getModels() {
  const User = mongoose.models.User || (await import('@/models/User')).default;
  const Role = mongoose.models.Role || (await import('@/models/Role')).default;
  const UserRole = mongoose.models.UserRole || (await import('@/models/UserRole')).default;
  const BusinessMember = mongoose.models.BusinessMember || (await import('@/models/BusinessMember')).default;
  const EmployeeProfile = mongoose.models.EmployeeProfile || (await import('@/models/EmployeeProfile')).default;
  const VendorProfile = mongoose.models.VendorProfile || (await import('@/models/VendorProfile')).default;
  return { User, Role, UserRole, BusinessMember, EmployeeProfile, VendorProfile };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { User, Role, UserRole, EmployeeProfile, VendorProfile } = await getModels();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const statusFilter = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (statusFilter) query.status = statusFilter;

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments(query);

    // Enrich with roles and profiles
    const enrichedUsers = await Promise.all(
      users.map(async (user: Record<string, unknown>) => {
        const userId = user._id as mongoose.Types.ObjectId;
        const userRoles = await UserRole.find({ userId }).populate('roleId').lean();
        const roles = userRoles.map((ur: Record<string, unknown>) => ur.roleId);

        const employeeProfile = await EmployeeProfile.findOne({
          userId,
          isDeleted: { $ne: true },
        }).lean();

        const vendorProfile = await VendorProfile.findOne({
          userId,
          isDeleted: { $ne: true },
        }).lean();

        return { ...user, roles, employeeProfile, vendorProfile };
      })
    );

    // Filter by role if specified
    let filteredUsers = enrichedUsers;
    if (roleFilter) {
      filteredUsers = enrichedUsers.filter((u) =>
        (u.roles as Array<Record<string, unknown>>).some(
          (r) => r && (r as Record<string, unknown>).code === roleFilter
        )
      );
    }

    return NextResponse.json({
      users: filteredUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { User, Role, UserRole, BusinessMember, EmployeeProfile, VendorProfile } = await getModels();

    const body = await request.json();
    const { name, email, password, role, businessId, employeeData, vendorData } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email, isDeleted: { $ne: true } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isActive: true,       // CORRECT field — User schema uses isActive not status
      isEmailVerified: false,
      authProvider: 'credentials',
      isDeleted: false,
    });

    // Find or create role
    let roleDoc = await Role.findOne({ code: role.toUpperCase() });
    if (!roleDoc) {
      roleDoc = await Role.create({ name: role, code: role.toUpperCase(), description: role, isSystem: false });
    }

    // Create UserRole
    await UserRole.create({ userId: user._id, roleId: roleDoc._id });

    // Create BusinessMember if businessId provided
    if (businessId) {
      await BusinessMember.create({
        userId: user._id,
        businessId,
        memberType: role.toUpperCase(),
        status: 'ACTIVE',
        isDefaultBusiness: true,
      });
    }

    // Generate and create EmployeeProfile
    if (role === 'EMPLOYEE') {
      const count = await EmployeeProfile.countDocuments();
      const employeeId = `EMP-${String(count + 1).padStart(3, '0')}`;
      await EmployeeProfile.create({
        userId: user._id,
        businessId: businessId || new mongoose.Types.ObjectId(),
        employeeId,
        ...employeeData,
      });
    }

    // Generate and create VendorProfile
    if (role === 'VENDOR') {
      const count = await VendorProfile.countDocuments();
      const vendorId = `VEN-${String(count + 1).padStart(3, '0')}`;
      await VendorProfile.create({
        userId: user._id,
        businessId: businessId || new mongoose.Types.ObjectId(),
        vendorId,
        email,
        companyName: vendorData?.companyName || name,
        ...vendorData,
      });
    }

    const createdUser = await User.findById(user._id).select('-password').lean();
    return NextResponse.json({ user: createdUser }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
