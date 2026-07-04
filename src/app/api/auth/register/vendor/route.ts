import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Business from '@/models/Business'
// IMPORTANT: use the canonical VendorProfile model. This route previously
// declared its own inline VendorProfile schema WITHOUT businessId — whichever
// module loaded first won the mongoose.models registry, silently disabling
// business scoping, and self-registered vendors were created as orphans not
// linked to any business ("vendors under which business??").
import VendorProfile from '@/models/VendorProfile'

async function generateVendorId(): Promise<string> {
  const year = new Date().getFullYear()
  // vendorId is globally unique in the schema, so count globally.
  const count = await VendorProfile.countDocuments()
  const seq = String(count + 1).padStart(4, '0')
  return `VND-${year}-${seq}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      businessId,
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

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'businessId is required — a vendor must register under a specific business (e.g. Native)',
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

    // The target business must exist and be active
    const business = await (Business as any)
      .findOne({ _id: businessId, isActive: true })
      .select('_id name')
      .lean()
    if (!business) {
      return NextResponse.json(
        { success: false, message: 'Business not found or inactive' },
        { status: 404 }
      )
    }

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
      businessId: business._id,
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
        business: business.name,
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
