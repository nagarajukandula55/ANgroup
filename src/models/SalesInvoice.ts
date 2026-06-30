/**
 * SalesInvoice — canonical model for sales invoices.
 *
 * Previously this schema was defined inline in 4 separate API route files:
 *   - src/app/api/sales/invoices/route.ts
 *   - src/app/api/sales/invoices/[id]/route.ts
 *   - src/app/api/sales/invoices/[id]/share/route.ts
 *   - src/app/api/sales/invoices/[id]/mark-paid/route.ts
 *
 * All four used `mongoose.models.SalesInvoice || mongoose.model("SalesInvoice", InvoiceSchema)`,
 * which prevented Mongoose OverwriteModelError during hot-reload but duplicated schema
 * definitions across files. This central file is the single source of truth.
 *
 * API routes can import this model via:
 *   import SalesInvoice from "@/models/SalesInvoice";
 */

import mongoose, { Schema, Model, Document } from "mongoose";

export interface ISalesInvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface ISalesInvoice extends Document {
  invoiceNumber: string;
  businessId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    gstin?: string;
  };
  items: ISalesInvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountAmount: number;
  grandTotal: number;
  currency: string;
  notes?: string;
  terms?: string;
  dueDate?: Date;
  issueDate: Date;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  shareToken?: string;
  shareExpiry?: Date;
  paidAt?: Date;
  paidAmount?: number;
  paymentMethod?: string;
  paymentRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<ISalesInvoice>(
  {
    invoiceNumber: { type: String, unique: true },
    businessId: { type: Schema.Types.ObjectId },
    createdBy: { type: Schema.Types.ObjectId },

    customer: {
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
      gstin: { type: String },
    },

    items: [
      {
        description: String,
        quantity: { type: Number, default: 1 },
        unit: { type: String, default: "pcs" },
        unitPrice: { type: Number, default: 0 },
        taxRate: { type: Number, default: 0 },
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

    shareToken: { type: String, index: true, sparse: true },
    shareExpiry: { type: Date },

    paidAt: { type: Date },
    paidAmount: { type: Number, default: 0 },
    paymentMethod: { type: String },
    paymentRef: { type: String },
  },
  { timestamps: true }
);

const SalesInvoice: Model<ISalesInvoice> =
  (mongoose.models.SalesInvoice as Model<ISalesInvoice>) ||
  mongoose.model<ISalesInvoice>("SalesInvoice", InvoiceSchema);

export default SalesInvoice;
