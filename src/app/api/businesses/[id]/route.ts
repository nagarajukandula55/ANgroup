import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'

import Business from '@/models/Business'
import BusinessLocation from '@/models/BusinessLocation'
import BusinessSettings from '@/models/BusinessSettings'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const business = await Business.findById(params.id)

    const locations = await BusinessLocation.find({
      businessId: params.id,
    })

    const settings = await BusinessSettings.findOne({
      businessId: params.id,
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
