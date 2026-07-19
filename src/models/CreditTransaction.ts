import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * One ledger entry against a CreditAccount. INVOICE raises the account's
 * outstanding balance (a credit sale), PAYMENT/ADJUSTMENT lower it — amount
 * is always entered as a positive number, the type decides the direction
 * (see the transactions route, which is the only writer and keeps
 * CreditAccount.outstandingBalance in sync).
 */
export interface ICreditTransaction extends Document {
  businessId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  type: "INVOICE" | "PAYMENT" | "ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  referenceOrderId?: string;
  dueDate?: Date | null;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CreditTransactionSchema = new Schema<ICreditTransaction>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "VendorProfile", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "CreditAccount", required: true },
    type: { type: String, enum: ["INVOICE", "PAYMENT", "ADJUSTMENT"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceOrderId: String,
    dueDate: { type: Date, default: null },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CreditTransactionSchema.index({ accountId: 1, createdAt: -1 });

const CreditTransaction: Model<ICreditTransaction> =
  mongoose.models.CreditTransaction || mongoose.model<ICreditTransaction>("CreditTransaction", CreditTransactionSchema);

export default CreditTransaction;
