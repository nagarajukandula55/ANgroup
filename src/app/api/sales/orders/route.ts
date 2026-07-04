/**
 * Sales Orders API
 */
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import mongoose, { Schema, Model } from 'mongoose'
import { notify } from '@/lib/notify'

const SalesOrderSchema = new Schema({
  orderNumber: { type: String, unique: true },
  customer: { type: String, required: true },
  customerEmail: String,
  items: [{
    name: String, sku: String, quantity: Number, unitPrice: Number, total: Number
  }],
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['DRAFT','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED'], default: 'DRAFT' },
  businessId: String,
  notes: String,
  deliveryDate: Date,
  shippingAddress: String,
  isDeleted: { type: Boolean, default: false },
  createdBy: String,
}, { timestamps: true, versionKey: false })

const SalesOrder: Model<any> = mongoose.models.SalesOrder || mongoose.model('SalesOrder', SalesOrderSchema)

async function getNextOrderNumber(): Promise<string> {
  const last = await SalesOrder.findOne({}, {}, { sort: { createdAt: -1 } })
  if (!last?.orderNumber) return 'SO-0001'
  const num = parseInt(last.orderNumber.split('-')[1] || '0') + 1
  return `SO-${String(num).padStart(4, '0')}`
}

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 })
    await connectDB()
    // Scope to the active business — same header-or-query convention as
    // /api/sales/invoices — otherwise every business shares the same
    // orders list, which is a real multi-tenant data leak.
    const url = new URL(req.url)
    const bizId = req.headers.get('x-active-business-id') || url.searchParams.get('businessId')
    const filter: Record<string, unknown> = { isDeleted: false }
    if (bizId) {
      filter.businessId = bizId
    } else {
      filter.createdBy = userId
    }
    const orders = await SalesOrder.find(filter).sort({ createdAt: -1 }).lean()
    const totalRevenue = orders.filter((o: any) => o.status === 'DELIVERED').reduce((s: number, o: any) => s + o.totalAmount, 0)
    return NextResponse.json({ success: true, orders, totalRevenue })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 })
    await connectDB()
    const body = await req.json()
    const bizId = req.headers.get('x-active-business-id') || body.businessId
    const orderNumber = await getNextOrderNumber()
    const total = (body.items || []).reduce((s: number, i: any) => s + (i.quantity * i.unitPrice), 0)
    const order = await SalesOrder.create({ ...body, businessId: bizId, orderNumber, totalAmount: total, createdBy: userId })

    // Fire notification (non-blocking)
    notify({
      event: 'NEW_ORDER',
      message: `🛒 New sales order received.\nOrder: ${orderNumber}\nCustomer: ${body.customer || 'N/A'}\nAmount: ₹${total.toLocaleString('en-IN')}\nStatus: ${body.status || 'DRAFT'}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
