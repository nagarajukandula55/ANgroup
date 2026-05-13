import { NextResponse } from 'next/server'

import bcrypt from 'bcryptjs'

import jwt from 'jsonwebtoken'

import { connectDB } from '@/lib/mongodb'

import User from '@/models/User'

export async function POST(req: Request) {
  try {
    await connectDB()

    const body = await req.json()

    const user = await User.findOne({
      email: body.email,
    }).populate('businessId')

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
      })
    }

    const valid = await bcrypt.compare(
      body.password,
      user.password
    )

    if (!valid) {
      return NextResponse.json({
        success: false,
        message: 'Invalid password',
      })
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: '7d',
      }
    )

    return NextResponse.json({
      success: true,
      token,
      user,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error,
    })
  }
}
