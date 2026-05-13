import { NextResponse } from 'next/server'

import { connectDB } from '@/lib/mongodb'

import Business from '@/models/Business'

export async function GET() {
  try {
    await connectDB()

    const businesses = await Business.find().sort({
      createdAt: -1,
    })

    return NextResponse.json({
      success: true,
      businesses,
    })
  } catch (error: any) {
    console.error('BUSINESS_FETCH_ERROR:', error)

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch businesses',
      },
      {
        status: 500,
      }
    )
  }
}
