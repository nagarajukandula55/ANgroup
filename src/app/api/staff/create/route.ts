import { NextResponse } from 'next/server'

import bcrypt from 'bcryptjs'

import { connectDB } from '@/lib/mongodb'

import User from '@/models/User'

export async function POST(req: Request) {
  try {
    await connectDB()

    const body = await req.json()

    const hashedPassword = await bcrypt.hash(
      body.password,
      10
    )

    const user = await User.create({
      name: body.name,
      email: body.email,
      password: hashedPassword,
      role: body.role,
      permissions: body.permissions,
      businessId: body.businessId,
    })

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error,
    })
  }
}
