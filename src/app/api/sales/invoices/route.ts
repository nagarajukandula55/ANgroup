import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { notify } from "@/lib/notify";

/* ── Inline schema — GST-compliant ───────────────────────────────── */
const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    businessId:    { type: mongoose.Schema.Types.ObjectId },
    createdBy:     { type: mongoose.Schema.Types.ObjectId },

    /* Supply type determines CGST+SGST vs IGST */
    supplyType: { type: String, enum: ["INTRASTATE", "INTERSTATE"], default: "INTRASTATE" },
    placeOfSupply: { type: String },

    customer: {
      name:    { type: String, required: true },
      email:   { type: String },
      phone:   { type: String },
      address: { type: String },
      gstin:   { type: String },
    },

    items: [{
      description: String,
      hsnCode:     { type: String, default: "" },    // HSN/SAC code
      quantity:    { type: Number, default: 1 },
      unit:        { type: String, default: "Nos" },
      unitPrice:   { type: Number, default: 0 },
      taxRate:     { type: Number, default: 0 },     // Total GST %
      taxAmount:   { type: Number, default: 0 },     // Total GST ₹
      cgstRate:    { type: Number, default: 0 },
      cgstAmount:  { type: Number, default: 0 },
      sgstRate:    { type: Number, default: 0 },
      sgstAmount:  { type: Number, default: 0 },
      igstRate:    { type: Number, default: 0 },
      igstAmount:  { type: Number, default: 0 },
      total:       { type: Number, default: 0 },     // Line total incl. tax
    }],

    subtotal:       { type: Number, default: 0 },   // Sum of taxable values
    cgstTotal:      { type: Number, default: 0 },
    sgstTotal:      { type: Number, default: 0 },
    igstTotal:      { type: Number, default: 0 },
    taxTotal:       { type: Number, default: 0 },   // Total GST
    discountAmount: { type: Number, default: 0 },
    grandTotal:     { type: Number, default: 0 },

    currency: { type: String, default: "INR" },
    notes:    { type: String },
    terms:    { type: String },
    dueDate:  { type: Date },
    issueDate:{ type: Date, default: Date.now },

    status: {
      type: String,
      enum: ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"],
      default: "DRAFT",
    },

    shareToken:  { type: String, index: true, sparse: true },
    shareExpiry: { type: Date },
    paidAt:      { type: Date },
    paidAmount:  { type: Number, default: 0 },
    paymentMethod: { type: String },
    paymentRef:    { type: String },
  },
  { timestamps: true }
);

const SalesInvoice =
  mongoose.models.SalesInvoice || mongoose.model("SalesInvoice", InvoiceSchema);

/* ── Invoice number generator ─────────────────────────────────────── */
async function nextInvoiceNumber(key: string): Promise<string> {
  const yr  = new Date().getFullYear()
  const mo  = String(new Date().getMonth() + 1).padStart(2, "0")
  const fy  = mo >= "04" ? `${yr}-${String(yr + 1).slice(2)}` : `${yr - 1}-${String(yr).slice(2)}`
  const prefix = `INV/${fy}/`

  const last = await SalesInvoice.findOne(
    { $or: [{ businessId: key }, { createdBy: key }], invoiceNumber: { $regex: `^${prefix}` } },
    { invoiceNumber: 1 }
  ).sort({ invoiceNumber: -1 }).lean() as any

  const seq = last
    ? parseInt(last.invoiceNumber.replace(prefix, "")) + 1
    : 1

  return `${prefix}${String(seq).padStart(4, "0")}`
}

/* ── GET /api/sales/invoices ──────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const h        = await headers()
    const userId   = h.get("x-user-id")
    const bizId    = h.get("x-active-business-id") || req.nextUrl.searchParams.get("businessId")

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const filter: any = {}
    if (bizId && mongoose.Types.ObjectId.isValid(bizId)) {
      filter.businessId = new mongoose.Types.ObjectId(bizId)
    } else {
      filter.createdBy = new mongoose.Types.ObjectId(userId)
    }

    const status = req.nextUrl.searchParams.get("status")
    if (status && status !== "ALL") filter.status = status

    const q = req.nextUrl.searchParams.get("search")
    if (q) filter.$or = [
      { invoiceNumber:     { $regex: q, $options: "i" } },
      { "customer.name":   { $regex: q, $options: "i" } },
    ]

    const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get("page")  || "1"))
    const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") || "50"))

    const [invoices, total] = await Promise.all([
      SalesInvoice.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SalesInvoice.countDocuments(filter),
    ])

    return NextResponse.json({ success: true, invoices, total, page, totalPages: Math.ceil(total / limit) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/* ── POST /api/sales/invoices ─────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const h      = await headers()
    const userId = h.get("x-user-id")
    const bizId  = h.get("x-active-business-id")

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const {
      customer,
      items       = [],
      notes,
      terms,
      dueDate,
      discountAmount = 0,
      status         = "DRAFT",
      supplyType     = "INTRASTATE",
      placeOfSupply,
    } = body

    if (!customer?.name) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 })
    }

    await connectDB()

    const effectiveBizId = body.businessId || bizId

    /* Compute GST-split per item */
    let subtotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0

    const processedItems = items.map((item: any) => {
      const lineAmt   = (item.quantity || item.qty || 1) * (item.unitPrice || item.price || 0)
      const totalGST  = lineAmt * ((item.taxRate || item.taxPct || 0) / 100)

      let cgstRate = 0, cgstAmount = 0, sgstRate = 0, sgstAmount = 0
      let igstRate = 0, igstAmount = 0

      if (supplyType === "INTERSTATE") {
        igstRate   = item.taxRate || item.taxPct || 0
        igstAmount = totalGST
        igstTotal += igstAmount
      } else {
        cgstRate   = (item.taxRate || item.taxPct || 0) / 2
        sgstRate   = cgstRate
        cgstAmount = totalGST / 2
        sgstAmount = totalGST / 2
        cgstTotal += cgstAmount
        sgstTotal += sgstAmount
      }

      subtotal += lineAmt

      return {
        description: item.description || "",
        hsnCode:     item.hsnCode     || "",
        quantity:    item.quantity    || item.qty || 1,
        unit:        item.unit        || "Nos",
        unitPrice:   item.unitPrice   || item.price || 0,
        taxRate:     item.taxRate     || item.taxPct || 0,
        taxAmount:   totalGST,
        cgstRate, cgstAmount,
        sgstRate, sgstAmount,
        igstRate, igstAmount,
        total: lineAmt + totalGST,
      }
    })

    const taxTotal   = cgstTotal + sgstTotal + igstTotal
    const grandTotal = subtotal + taxTotal - discountAmount

    const invoiceNumber = await nextInvoiceNumber(effectiveBizId || userId)

    const invoice = await SalesInvoice.create({
      invoiceNumber,
      businessId: effectiveBizId ? new mongoose.Types.ObjectId(effectiveBizId) : undefined,
      createdBy:  new mongoose.Types.ObjectId(userId),
      customer,
      supplyType,
      placeOfSupply,
      items:          processedItems,
      subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      taxTotal,
      discountAmount,
      grandTotal,
      notes,
      terms,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status,
    })

    notify({
      event:   "NEW_INVOICE",
      message: `🧾 New invoice ${invoice.invoiceNumber}\nCustomer: ${customer.name}\nAmount: ₹${grandTotal.toLocaleString("en-IN")}\nGST: ₹${taxTotal.toLocaleString("en-IN")}`,
    }).catch(() => {})

    return NextResponse.json({ success: true, invoice }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
