import { NextResponse } from 'next/server'

import { connectDB } from '@/lib/mongodb'

import Business from '@/models/Business'

export async function POST(req: Request) {
  try {
    await connectDB()

    const body = await req.json()

    const business = await Business.create({
      name: body.name,
      slug: body.slug,
      type: body.type,
      description: body.description,
    })

    return NextResponse.json({
      success: true,
      business,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error,
    })
  }
}
