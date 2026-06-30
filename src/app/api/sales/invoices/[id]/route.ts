import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import crypto from "crypto";

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: String,
    businessId: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    customer: { name: String, email: String, phone: String, address: String, gstin: String },
    items: [{ description: String, quantity: Number, unit: String, unitPrice: Number, taxRate: Number, taxAmount: Number, total: Number }],
    subtotal: Number, taxTotal: Number, discountAmount: Number, grandTotal: Number,
    currency: String, notes: String, terms: String, dueDate: Date, issueDate: Date,
    status: { type: String, enum: ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"], default: "DRAFT" },
    shareToken: String, shareExpiry: Date,
    paidAt: Date, paidAmount: Number, paymentMethod: String, paymentRef: String,
  },
  { timestamps: true }
);

const SalesInvoice = mongoose.models.SalesInvoice || mongoose.model("SalesInvoice", InvoiceSchema);

/* ── GET single invoice ──────────────────────────────────── */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await connectDB();

    const invoice = await SalesInvoice.findById(id).lean();
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── PUT update invoice ──────────────────────────────────── */
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    await connectDB();

    // Recalculate if items sent
    if (body.items) {
      let subtotal = 0, taxTotal = 0;
      body.items = body.items.map((item: any) => {
        const lineTotal = (item.quantity || 1) * (item.unitPrice || 0);
        const tax = lineTotal * ((item.taxRate || 0) / 100);
        subtotal += lineTotal;
        taxTotal += tax;
        return { ...item, taxAmount: tax, total: lineTotal + tax };
      });
      body.subtotal = subtotal;
      body.taxTotal = taxTotal;
      body.grandTotal = subtotal + taxTotal - (body.discountAmount || 0);
    }

    const invoice = await SalesInvoice.findByIdAndUpdate(id, { $set: body }, { new: true }).lean();
    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE invoice ──────────────────────────────────────── */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    await connectDB();
    await SalesInvoice.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
