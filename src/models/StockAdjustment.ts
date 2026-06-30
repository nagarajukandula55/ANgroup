import mongoose, { Schema, Model, Document } from "mongoose";

export type AdjustmentType = "ADD" | "REMOVE" | "SET";

export interface IStockAdjustment extends Document {
  businessId: mongoose.Types.ObjectId;
  inventoryItemId: mongoose.Types.ObjectId;
  adjustmentType: AdjustmentType;
  /** Quantity added, removed, or the absolute value to SET */
  quantityAdjusted: number;
  /** Snapshot of quantity before this adjustment */
  previousQuantity: number;
  /** Snapshot of quantity after this adjustment */
  newQuantity: number;
  reason?: string;
  notes?: string;
  adjustedBy: string; // userId string
  createdAt: Date;
  updatedAt: Date;
}

const StockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    businessId: { type: Schema.Types.ObjectId, required: true, index: true },
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Inventory",
      index: true,
    },
    adjustmentType: {
      type: String,
      enum: ["ADD", "REMOVE", "SET"],
      required: true,
    },
    quantityAdjusted: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    reason: { type: String },
    notes: { type: String },
    adjustedBy: { type: String, required: true },
  },
  { timestamps: true }
);

const StockAdjustment: Model<IStockAdjustment> =
  (mongoose.models.StockAdjustment as Model<IStockAdjustment>) ||
  mongoose.model<IStockAdjustment>("StockAdjustment", StockAdjustmentSchema);

export default StockAdjustment;
