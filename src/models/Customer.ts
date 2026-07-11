/**
 * Customer — a standalone customer record, independent of any one order or
 * invoice. No such collection existed before this: SalesInvoice.customer
 * (and similar embedded shapes elsewhere) are per-document snapshots, not a
 * real customer directory. Built for manual entry now, with each business's
 * own customer data expected to be aggregated in here later (hence the
 * optional businessId + free-text source field rather than a hard link).
 */

import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface ICustomer extends Document {
  businessId?: Types.ObjectId | null;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // Free text: "manual", a business name, an import batch label, etc. --
  // not an enum since this will grow organically as businesses are
  // aggregated in.
  source?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", default: null, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    source: { type: String, trim: true, default: "manual" },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ businessId: 1, isActive: 1 });
CustomerSchema.index({ name: "text", phone: "text", email: "text" });

const Customer: Model<ICustomer> =
  (mongoose.models.Customer as Model<ICustomer>) ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;
