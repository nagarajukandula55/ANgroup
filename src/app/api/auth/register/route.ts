import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import mongoose from 'mongoose'
import { logAction } from '@/lib/audit/logAction'

// Inline BusinessMember schema since no separate model file exists
const BusinessMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    role: { type: String, default: 'MEMBER' },
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

const BusinessMember =
  mongoose.models.BusinessMember ||
  mongoose.model('BusinessMember', BusinessMemberSchema)

const BusinessSchema = new mongoose.Schema(
  {
    name: String,
    businessCode: String,
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    marketplace: {
      enableB2C: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
)

const Business =
  mongoose.models.Business || mongoose.model('Business', BusinessSchema)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, phone } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email and password are required' },
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

    // Check if email already taken
    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
      isDeleted: false,
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcryptjs.hash(password, 12)

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone?.trim() || undefined,
      role: 'CUSTOMER',
      isActive: true,
      isEmailVerified: false,
      authProvider: 'credentials',
    })

    // Try to add as BusinessMember to any default B2C business
    try {
      const defaultBusiness = await Business.findOne({
        isDeleted: false,
        isActive: true,
        'marketplace.enableB2C': true,
      }).lean()

      if (defaultBusiness) {
        await BusinessMember.create({
          userId: user._id,
          businessId: (defaultBusiness as any)._id,
          role: 'CUSTOMER',
          isActive: true,
        })
      }
    } catch {
      // Non-fatal: proceed even if BusinessMember creation fails
    }

    logAction({
      action: "CREATE",
      entity: "User",
      entityId: user._id.toString(),
      after: { name: user.name, email: user.email, role: user.role },
      req,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        userId: user._id.toString(),
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
