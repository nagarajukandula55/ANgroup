import { NextResponse } from 'next/server'

import bcrypt from 'bcryptjs'

import { connectDB } from '@/lib/mongodb'

import User from '@/models/User'

import { logAction } from "@/lib/audit/logAction";
import { generateUniqueUserId } from '@/lib/auth/generateUserId'

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
      username: await generateUniqueUserId(),
      password: hashedPassword,
      role: body.role,
      permissions: body.permissions,
      businessId: body.businessId,
    })

    logAction({
      action: "CREATE",
      entity: "User",
      entityId: user._id?.toString(),
      after: user,
      req,
      actor: { businessId: body?.businessId?.toString() },
    });

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
