import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A Distributor or Retailer that a vendor extends credit to (sells now,
 * collects payment later, up to creditDays) — the vendor's own downstream
 * B2B customer, not to be confused with VendorProfile.creditLimit/
 * paymentTerms (that's credit AN Group/the business extends TO the vendor,
 * the opposite direction).
 *
 * outstandingBalance is a denormalized running total, kept in sync by
 * every CreditTransaction write (see that model/route) rather than summed
 * on every read — cheap to keep correct since all writes go through one
 * route, and every list/dashboard view needs it constantly.
 */
export interface ICreditAccount extends Document {
  businessId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  name: string;
  type: "DISTRIBUTOR" | "RETAILER";
  contactPerson?: string;
  phone?: string;
  email?: string;
  creditLimit: number;
  creditDays: number;
  outstandingBalance: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CreditAccountSchema = new Schema<ICreditAccount>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "VendorProfile", required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["DISTRIBUTOR", "RETAILER"], required: true },
    contactPerson: String,
    phone: String,
    email: String,
    creditLimit: { type: Number, default: 0, min: 0 },
    creditDays: { type: Number, default: 30, min: 0 },
    outstandingBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: String,
  },
  { timestamps: true }
);

CreditAccountSchema.index({ vendorId: 1, isActive: 1 });

const CreditAccount: Model<ICreditAccount> =
  mongoose.models.CreditAccount || mongoose.model<ICreditAccount>("CreditAccount", CreditAccountSchema);

export default CreditAccount;
