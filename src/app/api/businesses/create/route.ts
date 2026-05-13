import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'

import Business from '@/models/Business'
import BusinessLocation from '@/models/BusinessLocation'
import BusinessSettings from '@/models/BusinessSettings'

function generateBusinessCode() {
  const random = Math.floor(1000 + Math.random() * 9000)

  return `BUS-${random}`
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
}

export async function POST(req: Request) {
  try {
    await connectDB()

    const body = await req.json()

    const {
      name,
      legalName,
      brandName,
      businessType,
      industry,
      description,
      website,
      email,
      phone,
      gstNumber,
      panNumber,
      legalEntityType,
      location,
    } = body

    const slug = generateSlug(name)

    const businessCode = generateBusinessCode()

    const business = await Business.create({
      businessCode,

      name,
      legalName,
      brandName,

      slug,

      businessType,
      industry,

      description,

      website,
      email,
      phone,

      gstNumber,
      panNumber,

      legalEntityType,

      active: true,
      aiEnabled: true,
    })

    await BusinessLocation.create({
      businessId: business._id,

      type: 'head-office',

      addressLine1: location?.addressLine1,

      addressLine2: location?.addressLine2,

      city: location?.city,

      state: location?.state,

      country: location?.country,

      pincode: location?.pincode,
    })

    await BusinessSettings.create({
      businessId: business._id,
    })

    return NextResponse.json({
      success: true,
      message: 'Business created successfully',
      business,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create business',
      },
      {
        status: 500,
      }
    )
  }
}
