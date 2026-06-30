import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { notify } from "@/lib/notify";

/* ── Inline schemas (bridge to existing models) ─────────── */
const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    businessId: { type: mongoose.Schema.Types.ObjectId },
    createdBy: { type: mongoose.Schema.Types.ObjectId },

    // Customer (offline partner — may or may not be a User)
    customer: {
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
      gstin: { type: String },
    },

    // Line items
    items: [
      {
        description: String,
        quantity: { type: Number, default: 1 },
        unit: { type: String, default: "pcs" },
        unitPrice: { type: Number, default: 0 },
        taxRate: { type: Number, default: 0 }, // GST %
        taxAmount: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
    ],

    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    currency: { type: String, default: "INR" },
    notes: { type: String },
    terms: { type: String },
    dueDate: { type: Date },
    issueDate: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"],
      default: "DRAFT",
    },

    // Public share token for offline partners (no login needed)
    shareToken: { type: String, index: true, sparse: true },
    shareExpiry: { type: Date },

    paidAt: { type: Date },
    paidAmount: { type: Number, default: 0 },
    paymentMethod: { type: String },
    paymentRef: { type: String },
  },
  { timestamps: true }
);

const SalesInvoice =
  mongoose.models.SalesInvoice ||
  mongoose.model("SalesInvoice", InvoiceSchema);

/* ── Generate invoice number ─────────────────────────────── */
async function nextInvoiceNumber(businessId: string): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const prefix = `INV-${year}${month}-`;

  const last = await SalesInvoice.findOne(
    { businessId, invoiceNumber: { $regex: `^${prefix}` } },
    { invoiceNumber: 1 }
  )
    .sort({ invoiceNumber: -1 })
    .lean();

  const seq = last
    ? parseInt((last as any).invoiceNumber.replace(prefix, "")) + 1
    : 1;

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/* ── GET /api/sales/invoices ─────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    const businessId = req.nextUrl.searchParams.get("businessId");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const filter: any = {};
    if (businessId) filter.businessId = new mongoose.Types.ObjectId(businessId);
    else filter.createdBy = new mongoose.Types.ObjectId(userId);

    const status = req.nextUrl.searchParams.get("status");
    if (status && status !== "ALL") filter.status = status;

    const search = req.nextUrl.searchParams.get("search");
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { "customer.name": { $regex: search, $options: "i" } },
      ];
    }

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "20"));

    const [invoices, total] = await Promise.all([
      SalesInvoice.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SalesInvoice.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, invoices, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST /api/sales/invoices ────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await connectDB();

    const { businessId, customer, items, notes, terms, dueDate, discountAmount = 0 } = body;

    // Recalculate totals server-side
    let subtotal = 0;
    let taxTotal = 0;
    const processedItems = (items || []).map((item: any) => {
      const lineTotal = (item.quantity || 1) * (item.unitPrice || 0);
      const tax = lineTotal * ((item.taxRate || 0) / 100);
      subtotal += lineTotal;
      taxTotal += tax;
      return { ...item, taxAmount: tax, total: lineTotal + tax };
    });

    const grandTotal = subtotal + taxTotal - discountAmount;
    const invoiceNumber = await nextInvoiceNumber(businessId || userId);

    const invoice = await SalesInvoice.create({
      invoiceNumber,
      businessId: businessId ? new mongoose.Types.ObjectId(businessId) : undefined,
      createdBy: new mongoose.Types.ObjectId(userId),
      customer,
      items: processedItems,
      subtotal,
      taxTotal,
      discountAmount,
      grandTotal,
      notes,
      terms,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: body.status || "DRAFT",
    });

    // Fire notification (non-blocking)
    notify({
      event: 'NEW_INVOICE',
      message: `🧾 New invoice created.\nInvoice: ${invoice.invoiceNumber}\nCustomer: ${customer?.name || 'N/A'}\nAmount: ₹${grandTotal.toLocaleString('en-IN')}\nStatus: ${invoice.status}`,
    }).catch(() => {});

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
