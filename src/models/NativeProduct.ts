/**
 * NativeProduct — canonical model for this platform's OWN products, stored
 * on the DEFAULT mongoose connection.
 *
 * IMPORTANT — there are THREE separate "native product" things in this
 * codebase, previously conflated in this file's own top comment (which
 * incorrectly claimed "no files currently import this model" and treated
 * `Native Product.ts` as a dead duplicate to delete). Corrected after
 * investigation:
 *
 * 1. THIS file (`models/NativeProduct.ts`) — the canonical model on the
 *    DEFAULT connection. Now used by BOTH `api/product-categories/route.ts`
 *    (an aggregate product-count query — its only caller before this fix)
 *    AND `api/products/route.ts` (see #3 below — merged into this file).
 * 2. `models/Native Product.ts` (space in the filename) — genuinely
 *    DIFFERENT and NOT a duplicate: it exports `getProductModel(conn)`,
 *    used by `services/product.service.ts` and `api/orders/create/route.ts`
 *    against a SEPARATE MongoDB connection (`lib/native-mongodb.ts`'s
 *    `connectNativeDB()` — a second, distinct database, likely the
 *    original ecommerce store's legacy DB). This is a real, intentional,
 *    still-live separate system — left completely untouched.
 * 3. `api/products/route.ts` used to declare its OWN THIRD inline schema,
 *    registered under the exact same Mongoose model name `"NativeProduct"`
 *    as THIS file but on the DEFAULT connection — a real collision (same
 *    "whichever loads first silently wins" bug class already fixed for
 *    SalesInvoice.ts). That route's extra SEO fields (metaTitle,
 *    metaDescription, keywords, slug) and `isDeleted` flag were NOT on
 *    this file before — merged in additively below, and that route now
 *    imports this file instead of declaring its own copy.
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
  isDeleted?: boolean;
  stock?: number;
  reorderLevel?: number;
  // ── SEO fields (merged in from api/products/route.ts's inline schema —
  // see this file's top comment) ──────────────────────────────────────
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  slug?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NativeProductSchema = new Schema<INativeProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String },
    description: { type: String },
    category: { type: String },
    businessId: { type: Schema.Types.ObjectId, ref: "Business" },
    unit: { type: String, default: "pcs" },
    basePrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 }, // default GST 18%
    hsn: { type: String },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    stock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    // SEO fields — merged in, see this file's top comment
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: { type: [String], default: [] },
    slug: { type: String, unique: true, sparse: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
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
