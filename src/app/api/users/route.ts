/**
 * Users API
 * GET  /api/users  — list users (admin only)
 * POST /api/users  — create user (admin only)
 */

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'
import { logAction } from '@/lib/audit/logAction'

const SALT_ROUNDS = 12

export async function GET(req: Request) {
  try {
    const role = req.headers.get('x-user-role') || ''
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const userRole = searchParams.get('role')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const query: any = { isDeleted: false }
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true'
    }
    if (userRole) query.role = userRole
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: any) {
    console.error('Users GET error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const role = req.headers.get('x-user-role') || ''
    const requesterId = req.headers.get('x-user-id')

    if (!requesterId || !['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
    }

    await connectDB()

    const body = await req.json()
    const { name, email, username, phone, password, userRole, isActive } = body

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ success: false, message: 'Name and email are required' }, { status: 400 })
    }

    // Only super admin can create admins
    if (userRole === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Only super admin can assign SUPER_ADMIN role' }, { status: 403 })
    }

    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : undefined

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: username?.toLowerCase()?.trim() || null,
      phone: phone?.trim() || null,
      password: hashedPassword,
      role: userRole || 'STAFF',
      isActive: isActive !== false,
      isEmailVerified: false,
      authProvider: 'credentials',
    })

    const userObj = user.toObject()
    delete (userObj as any).password

    logAction({
      action: "CREATE",
      entity: "User",
      entityId: user._id?.toString(),
      after: userObj,
      req,
    })

    return NextResponse.json({ success: true, user: userObj }, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0]
      return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 409 })
    }
    console.error('Users POST error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
