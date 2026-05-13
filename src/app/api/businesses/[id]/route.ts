import { NextResponse } from 'next/server'

import { connectDB } from '@/lib/mongodb'

import Business from '@/models/Business'
import BusinessLocation from '@/models/BusinessLocation'
import BusinessSettings from '@/models/BusinessSettings'

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string
    }>
  }
) {
  try {
    await connectDB()

    const { id } = await context.params

    const business = await Business.findById(id)

    const locations = await BusinessLocation.find({
      businessId: id,
    })

    const settings = await BusinessSettings.findOne({
      businessId: id,
    })

    return NextResponse.json({
      success: true,
      business,
      locations,
      settings,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch business',
      },
      {
        status: 500,
      }
    )
  }
}
