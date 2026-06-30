import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import mongoose from 'mongoose'

const EmployeeProfileSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String },
    department: { type: String },
    designation: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

const EmployeeProfile =
  mongoose.models.EmployeeProfile ||
  mongoose.model('EmployeeProfile', EmployeeProfileSchema)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { employeeId, email, password } = body

    if (!employeeId || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Employee ID, email and password are required',
        },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must be at least 8 characters long',
        },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address' },
        { status: 400 }
      )
    }

    await connectDB()

    // Find employee profile by employeeId
    const employeeProfile = await EmployeeProfile.findOne({
      employeeId: employeeId.trim(),
      isDeleted: false,
    })

    if (!employeeProfile) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Employee ID not found. Please check your ID or contact HR.',
        },
        { status: 404 }
      )
    }

    // Check if already linked to a user account
    if (employeeProfile.userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This Employee ID is already linked to an account. Please contact HR if you believe this is an error.',
        },
        { status: 409 }
      )
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
      isDeleted: false,
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this email already exists',
        },
        { status: 409 }
      )
    }

    const hashedPassword = await bcryptjs.hash(password, 12)

    const user = await User.create({
      name: employeeProfile.name || employeeId,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'EMPLOYEE',
      isActive: false, // HR must activate
      isEmailVerified: false,
      authProvider: 'credentials',
    })

    // Link employee profile to user
    await EmployeeProfile.findByIdAndUpdate(employeeProfile._id, {
      $set: { userId: user._id },
    })

    return NextResponse.json(
      {
        success: true,
        message:
          'Account created successfully. Please contact your HR department to activate your account.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this email already exists',
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
