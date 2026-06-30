import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import connectDB from '@/lib/mongodb'
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

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  vendorId: { type: mongoose.Schema.Types.ObjectId },
  vendorProfileId: { type: mongoose.Schema.Types.ObjectId },
  items: Array,
  subtotal: Number,
  taxAmount: Number,
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, default: 'DRAFT' },
  dueDate: Date,
  description: String,
  createdAt: { type: Date, default: Date.now },
})

const Invoice =
  mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema)

const PaymentSchema = new mongoose.Schema({
  paymentNumber: String,
  vendorId: { type: mongoose.Schema.Types.ObjectId },
  vendorProfileId: { type: mongoose.Schema.Types.ObjectId },
  invoiceId: { type: mongoose.Schema.Types.ObjectId },
  amount: { type: Number, default: 0 },
  method: String,
  notes: String,
  type: { type: String, default: 'Payment' },
  createdAt: { type: Date, default: Date.now },
})

const Payment =
  mongoose.models.Payment || mongoose.model('Payment', PaymentSchema)

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
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    const dateFilter: Record<string, any> = {}
    if (fromStr) {
      dateFilter.$gte = new Date(fromStr)
    }
    if (toStr) {
      const toDate = new Date(toStr)
      toDate.setHours(23, 59, 59, 999)
      dateFilter.$lte = toDate
    }

    const vendorFilter: Record<string, any> = {
      $or: [
        { vendorId: (vendor as any)._id },
        { vendorProfileId: (vendor as any)._id },
      ],
    }

    if (Object.keys(dateFilter).length > 0) {
      vendorFilter.createdAt = dateFilter
    }

    const [invoices, payments] = await Promise.all([
      Invoice.find(vendorFilter).sort({ createdAt: 1 }).lean(),
      Payment.find(vendorFilter).sort({ createdAt: 1 }).lean(),
    ])

    // Build unified transaction list
    type TxEntry = {
      date: string
      type: 'Invoice' | 'Payment' | 'Credit'
      reference: string
      description: string
      amount: number
      sortDate: Date
    }

    const rawTransactions: TxEntry[] = [
      ...invoices.map((inv: any) => ({
        date: new Date(inv.createdAt).toISOString(),
        type: 'Invoice' as const,
        reference: inv.invoiceNumber || '',
        description: inv.description || 'Invoice',
        amount: inv.totalAmount || 0,
        sortDate: new Date(inv.createdAt),
      })),
      ...payments.map((pay: any) => ({
        date: new Date(pay.createdAt).toISOString(),
        type: (pay.type === 'Credit' ? 'Credit' : 'Payment') as
          | 'Invoice'
          | 'Payment'
          | 'Credit',
        reference: pay.paymentNumber || '',
        description: pay.notes || `Payment via ${pay.method || 'transfer'}`,
        amount: pay.amount || 0,
        sortDate: new Date(pay.createdAt),
      })),
    ].sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())

    // Calculate running balance (invoices add to balance, payments reduce it)
    let runningBalance = 0
    const transactions = rawTransactions.map((tx) => {
      if (tx.type === 'Invoice') {
        runningBalance += tx.amount
      } else {
        runningBalance -= tx.amount
      }
      return {
        date: tx.date,
        type: tx.type,
        reference: tx.reference,
        description: tx.description,
        amount: tx.amount,
        balance: runningBalance,
      }
    })

    // Summary calculations
    const totalInvoiced = invoices.reduce(
      (sum: number, inv: any) => sum + (inv.totalAmount || 0),
      0
    )
    const totalPaid = payments.reduce(
      (sum: number, pay: any) =>
        pay.type !== 'Credit' ? sum + (pay.amount || 0) : sum,
      0
    )
    const creditBalance = payments.reduce(
      (sum: number, pay: any) =>
        pay.type === 'Credit' ? sum + (pay.amount || 0) : sum,
      0
    )
    const outstanding = Math.max(0, totalInvoiced - totalPaid - creditBalance)

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        summary: {
          totalInvoiced,
          totalPaid,
          outstanding,
          creditBalance,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
