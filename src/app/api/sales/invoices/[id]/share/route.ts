import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import crypto from "crypto";

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: String, businessId: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    customer: { name: String, email: String, phone: String, address: String, gstin: String },
    items: [{ description: String, quantity: Number, unit: String, unitPrice: Number, taxRate: Number, taxAmount: Number, total: Number }],
    subtotal: Number, taxTotal: Number, discountAmount: Number, grandTotal: Number,
    currency: String, notes: String, terms: String, dueDate: Date, issueDate: Date,
    status: { type: String, default: "DRAFT" },
    shareToken: String, shareExpiry: Date,
    paidAt: Date, paidAmount: Number, paymentMethod: String, paymentRef: String,
  },
  { timestamps: true }
);

const SalesInvoice = mongoose.models.SalesInvoice || mongoose.model("SalesInvoice", InvoiceSchema);

/* ── POST — generate a public share link (72h) ───────────── */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    await connectDB();

    const token = crypto.randomBytes(24).toString("hex");
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const invoice = await SalesInvoice.findByIdAndUpdate(
      id,
      { shareToken: token, shareExpiry: expiry, status: "SENT" },
      { new: true }
    ).lean();

    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shareUrl = `${base}/invoice/view/${token}`;

    return NextResponse.json({ success: true, shareUrl, expiresAt: expiry });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
