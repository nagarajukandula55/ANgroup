import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'

const VendorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendorId: { type: String, unique: true },
  companyName: String,
  isApproved: { type: Boolean, default: false },
})

const VendorProfile =
  mongoose.models.VendorProfile ||
  mongoose.model('VendorProfile', VendorProfileSchema)

const OrderSchema = new mongoose.Schema({
  orderNumber: String,
  vendorId: { type: mongoose.Schema.Types.ObjectId },
  vendorProfileId: { type: mongoose.Schema.Types.ObjectId },
  customerId: { type: mongoose.Schema.Types.ObjectId },
  items: Array,
  totalAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema)

export async function GET(req: NextRequest) {
  try {
    const headersList = await headers()
    const userId = headersList.get('x-user-id')
    const userRole = headersList.get('x-user-role')

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (userRole !== 'VENDOR') {
      return NextResponse.json(
        { success: false, message: 'Vendor access required' },
        { status: 403 }
      )
    }

    await connectDB()

    const vendor = await VendorProfile.findOne({ userId }).lean()
    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor profile not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const status = searchParams.get('status') || ''

    const vendorFilter: Record<string, any> = {
      $or: [
        { vendorId: (vendor as any)._id },
        { vendorProfileId: (vendor as any)._id },
      ],
    }

    if (status && status !== 'ALL') {
      vendorFilter.status = status.toUpperCase()
    }

    const total = await Order.countDocuments(vendorFilter)
    const orders = await Order.find(vendorFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
