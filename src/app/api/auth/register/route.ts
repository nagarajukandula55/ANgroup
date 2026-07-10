import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import Business from '@/models/Business'
import BusinessMember from '@/models/BusinessMember'
import { logAction } from '@/lib/audit/logAction'
import { generateUniqueUserId } from '@/lib/auth/generateUserId'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, phone, username, businessId } = body

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

    // User ID — collected at signup per the requirement that it be unique.
    // Reuses the User model's existing `username` field (unique + sparse
    // already), rather than adding a second redundant field. Every user
    // must end up with a real value here (never left blank) — see
    // lib/auth/generateUserId.ts for why a blank/null username silently
    // breaks the next signup that also leaves it blank.
    const trimmedUsername = username ? String(username).toLowerCase().trim() : undefined
    if (trimmedUsername) {
      const existingUsername = await User.findOne({
        username: trimmedUsername,
        isDeleted: false,
      })
      if (existingUsername) {
        return NextResponse.json(
          { success: false, message: 'This user ID is already taken' },
          { status: 409 }
        )
      }
    }

    const hashedPassword = await bcryptjs.hash(password, 12)

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: trimmedUsername || (await generateUniqueUserId()),
      password: hashedPassword,
      phone: phone?.trim() || undefined,
      role: 'CUSTOMER',
      isActive: true,
      isEmailVerified: false,
      authProvider: 'credentials',
    })

    // Every registered user (from any storefront, e.g. Native) becomes a
    // CUSTOMER-level BusinessMember of the target B2C business -- nothing
    // more. A caller (a storefront) may pass its own businessId explicitly;
    // otherwise fall back to the first active B2C-enabled business, same as
    // before. Was previously declaring inline duplicate BusinessMember/
    // Business schemas instead of importing the canonical models -- a
    // classic Mongoose global-model-registry race (whichever definition
    // loaded first silently won app-wide) -- and never set `memberType`,
    // so BusinessMemberSchema's default ('STAFF') applied to every new
    // customer instead of 'CUSTOMER'.
    try {
      const targetBusiness = businessId
        ? await Business.findOne({ _id: businessId, isDeleted: false, isActive: true }).lean()
        : await Business.findOne({
            isDeleted: false,
            isActive: true,
            'marketplace.enableB2C': true,
          }).lean()

      if (targetBusiness) {
        await BusinessMember.create({
          userId: user._id,
          businessId: (targetBusiness as any)._id,
          memberType: 'CUSTOMER',
          status: 'ACTIVE',
          isDefaultBusiness: true,
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
        // Always non-null now (generated if the caller didn't choose one) —
        // this doubles as the "vendor code" a vendor uses on /vendor/staff
        // to add this person as their staff, and as the ID a business
        // admin looks up to add this person to a business as an employee.
        username: user.username,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.code === 11000) {
      const field = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'email'
      return NextResponse.json(
        {
          success: false,
          message:
            field === 'username'
              ? 'This user ID is already taken'
              : 'An account with this email already exists',
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
