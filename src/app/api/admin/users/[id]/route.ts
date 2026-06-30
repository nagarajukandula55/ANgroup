import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function getModels() {
  const User = mongoose.models.User || (await import('@/models/User')).default;
  const UserRole = mongoose.models.UserRole || (await import('@/models/UserRole')).default;
  const EmployeeProfile = mongoose.models.EmployeeProfile || (await import('@/models/EmployeeProfile')).default;
  const VendorProfile = mongoose.models.VendorProfile || (await import('@/models/VendorProfile')).default;
  return { User, UserRole, EmployeeProfile, VendorProfile };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    await connectDB();
    const { id } = await params;
    const { User, UserRole, EmployeeProfile, VendorProfile } = await getModels();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, password, status, role, employeeData, vendorData } = body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (status) updateData.status = status;
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const user = await User.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update employee profile if provided
    if (employeeData) {
      await EmployeeProfile.findOneAndUpdate(
        { userId: id },
        { $set: employeeData },
        { new: true }
      );
    }

    // Update vendor profile if provided
    if (vendorData) {
      await VendorProfile.findOneAndUpdate(
        { userId: id },
        { $set: vendorData },
        { new: true }
      );
    }

    return NextResponse.json({ user });
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
    await connectDB();
    const { id } = await params;
    const { User } = await getModels();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await User.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, status: 'INACTIVE' } },
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully', user });
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
