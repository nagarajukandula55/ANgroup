/* @deprecated Use GoodsReceipt instead. This model is kept for backwards compatibility. */

/**
 * GRN (Goods Receipt Note) — deprecated alias.
 *
 * This model has been superseded by GoodsReceipt (and GoodsReceiptItem).
 * The GRN concept (receiving goods against a Purchase Order) is now modelled via:
 *   - GoodsReceipt.ts / GoodsReceipt.js  — the receipt header
 *   - GoodsReceiptItem.ts / GoodsReceiptItem.js — individual line items
 *
 * The grn.service (src/services/grn.service.ts) should be the only consumer
 * of this model name. That service bridges the legacy GRN API route
 * (src/app/api/grn/[id]/route.ts) to the new GoodsReceipt data store.
 *
 * Do NOT add new code here. For new purchase-receipt functionality use GoodsReceipt.
 */

import mongoose, { Schema, Model, Document } from "mongoose";

/** @deprecated Use GoodsReceipt instead */
export interface IGRN extends Document {
  grnNumber: string;
  purchaseOrderId?: mongoose.Types.ObjectId;
  businessId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  receivedBy?: mongoose.Types.ObjectId;
  receivedAt: Date;
  items: {
    itemId?: mongoose.Types.ObjectId;
    description: string;
    orderedQty: number;
    receivedQty: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    condition?: string;
  }[];
  totalValue: number;
  status: "DRAFT" | "CONFIRMED" | "REJECTED";
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** @deprecated Use GoodsReceipt instead */
const GRNSchema = new Schema<IGRN>(
  {
    grnNumber: { type: String, unique: true },
    purchaseOrderId: { type: Schema.Types.ObjectId },
    businessId: { type: Schema.Types.ObjectId },
    vendorId: { type: Schema.Types.ObjectId },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    receivedAt: { type: Date, default: Date.now },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId },
        description: { type: String, required: true },
        orderedQty: { type: Number, default: 0 },
        receivedQty: { type: Number, default: 0 },
        unit: { type: String, default: "pcs" },
        unitCost: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 },
        condition: { type: String },
      },
    ],
    totalValue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["DRAFT", "CONFIRMED", "REJECTED"],
      default: "DRAFT",
    },
    remarks: { type: String },
  },
  { timestamps: true }
);

/** @deprecated Use GoodsReceipt instead */
const GRN: Model<IGRN> =
  (mongoose.models.GRN as Model<IGRN>) ||
  mongoose.model<IGRN>("GRN", GRNSchema);

export default GRN;
