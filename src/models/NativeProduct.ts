/**
 * NativeProduct — product model for products native to this business/organization.
 *
 * NOTE: A file named "Native Product.ts" (with a space in the filename) may exist
 * in this directory. Files with spaces in their names cannot be imported via standard
 * ES/TS import statements (e.g., `import X from "./Native Product"` fails). That file
 * is treated as a duplicate and this file (NativeProduct.ts, no space) is canonical.
 *
 * No files currently import this model (per import audit). It is provided here as
 * the definitive TypeScript version.
 *
 * If "Native Product.ts" exists, it should be deleted or replaced with a redirect
 * comment — it cannot be safely re-exported and is not importable by normal means.
 */

import mongoose, { Schema, Model, Document } from "mongoose";

export interface INativeProduct extends Document {
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  businessId?: mongoose.Types.ObjectId;
  unit?: string;
  basePrice?: number;
  taxRate?: number; // GST %
  hsn?: string; // HSN code for GST compliance
  images?: string[];
  isActive: boolean;
  stock?: number;
  reorderLevel?: number;
  createdAt: Date;
  updatedAt: Date;
}

const NativeProductSchema = new Schema<INativeProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String },
    description: { type: String },
    category: { type: String },
    businessId: { type: Schema.Types.ObjectId },
    unit: { type: String, default: "pcs" },
    basePrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 }, // default GST 18%
    hsn: { type: String },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    stock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for common queries
NativeProductSchema.index({ businessId: 1, isActive: 1 });
NativeProductSchema.index({ sku: 1 }, { sparse: true });

const NativeProduct: Model<INativeProduct> =
  (mongoose.models.NativeProduct as Model<INativeProduct>) ||
  mongoose.model<INativeProduct>("NativeProduct", NativeProductSchema);

export default NativeProduct;
