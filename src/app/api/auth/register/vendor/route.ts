import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import mongoose from 'mongoose'

const VendorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendorId: { type: String, unique: true },
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    gstNumber: { type: String, trim: true, uppercase: true },
    panNumber: { type: String, trim: true, uppercase: true },
    category: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
    isApproved: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const VendorProfile =
  mongoose.models.VendorProfile ||
  mongoose.model('VendorProfile', VendorProfileSchema)

async function generateVendorId(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await VendorProfile.countDocuments()
  const seq = String(count + 1).padStart(4, '0')
  return `VND-${year}-${seq}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      companyName,
      contactPerson,
      email,
      password,
      phone,
      gstNumber,
      panNumber,
      category,
      city,
      state,
      pincode,
    } = body

    if (!companyName || !contactPerson || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Company name, contact person, email and password are required',
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
      name: contactPerson.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone?.trim() || undefined,
      role: 'VENDOR',
      isActive: false, // Pending approval
      isEmailVerified: false,
      authProvider: 'credentials',
    })

    const vendorId = await generateVendorId()

    const vendorProfile = await VendorProfile.create({
      userId: user._id,
      vendorId,
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || undefined,
      gstNumber: gstNumber?.toUpperCase().trim() || undefined,
      panNumber: panNumber?.toUpperCase().trim() || undefined,
      category: category || undefined,
      address: {
        city: city?.trim() || undefined,
        state: state?.trim() || undefined,
        pincode: pincode?.trim() || undefined,
      },
      isApproved: false,
    })

    return NextResponse.json(
      {
        success: true,
        message:
          'Vendor application submitted successfully. Your account will be reviewed and approved within 24 hours.',
        vendorId: vendorProfile.vendorId,
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
