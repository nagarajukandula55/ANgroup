import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { connectDB } from '@/lib/mongodb'
import mongoose from 'mongoose'

// Inline VendorProfile schema
const VendorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendorId: { type: String, unique: true },
  companyName: String,
  contactPerson: String,
  email: String,
  phone: String,
  gstNumber: String,
  panNumber: String,
  category: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    ifscCode: String,
    bankName: String,
  },
  isApproved: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
})

const VendorProfile =
  mongoose.models.VendorProfile ||
  mongoose.model('VendorProfile', VendorProfileSchema)

// Inline Invoice schema
const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  vendorId: { type: mongoose.Schema.Types.ObjectId },
  vendorProfileId: { type: mongoose.Schema.Types.ObjectId },
  customerId: { type: mongoose.Schema.Types.ObjectId },
  items: Array,
  subtotal: Number,
  taxAmount: Number,
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'DRAFT',
  },
  dueDate: Date,
  createdAt: { type: Date, default: Date.now },
})

const Invoice =
  mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema)

// Inline Order schema
const OrderSchema = new mongoose.Schema({
  orderNumber: String,
  vendorId: { type: mongoose.Schema.Types.ObjectId },
  vendorProfileId: { type: mongoose.Schema.Types.ObjectId },
  items: Array,
  totalAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
  },
  createdAt: { type: Date, default: Date.now },
})

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema)

export async function GET() {
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

    const vendor = await VendorProfile.findOne({ userId }).lean() as any

    if (!vendor) {
      return NextResponse.json(
        { success: false, message: 'Vendor profile not found' },
        { status: 404 }
      )
    }

    const vendorFilter = {
      $or: [
        { vendorId: vendor._id },
        { vendorProfileId: vendor._id },
      ],
    }

    const [allOrders, recentOrders, pendingInvoices] = await Promise.all([
      Order.find(vendorFilter).lean(),
      Order.find(vendorFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Invoice.find({
        ...vendorFilter,
        status: { $in: ['SENT', 'OVERDUE'] },
      })
        .sort({ dueDate: 1 })
        .limit(3)
        .lean(),
    ])

    const totalOrders = allOrders.length
    const pendingOrders = allOrders.filter(
      (o: any) => o.status === 'PENDING'
    ).length
    const totalRevenue = allOrders.reduce(
      (sum: number, o: any) =>
        o.status === 'DELIVERED' ? sum + (o.totalAmount || 0) : sum,
      0
    )

    const allInvoices = await Invoice.find(vendorFilter).lean()
    const outstanding = allInvoices.reduce(
      (sum: number, inv: any) =>
        ['SENT', 'OVERDUE'].includes(inv.status)
          ? sum + ((inv.totalAmount || 0) - (inv.paidAmount || 0))
          : sum,
      0
    )

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          companyName: (vendor as any).companyName,
          vendorId: (vendor as any).vendorId,
        },
        stats: {
          totalOrders,
          pendingOrders,
          totalRevenue,
          outstanding,
        },
        orders: recentOrders,
        invoices: pendingInvoices,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
