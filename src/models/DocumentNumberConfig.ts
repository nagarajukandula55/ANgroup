import mongoose, { Schema, Model, Document } from "mongoose";
import { DOCUMENT_TYPES, type DocumentType } from "@/core/numbering/types";

/* =========================================================
 * SUPPORTED DOCUMENT TYPES
 *
 * Re-exported from core/numbering/types.ts (the single canonical list,
 * built during the numbering-engine consolidation — see that file's top
 * comment) rather than declared separately here. This used to be its own
 * independent list of 10 types; core/numbering/types.ts's list is a
 * superset (adds PRODUCT, PRODUCT_VARIANT, VENDOR_PRODUCT,
 * STOCK_ADJUSTMENT, STOCK_TRANSFER, BATCH, CUSTOMER_ORDER, RECEIPT — types
 * that generate real documents elsewhere in the app but weren't
 * admin-configurable before this consolidation). Re-exporting instead of
 * duplicating means the admin UI (Settings > Document Numbers), this
 * model, and the numbering engine can never drift out of sync again.
 * =======================================================*/
export { DOCUMENT_TYPES };
export type { DocumentType };

/* =========================================================
 * DOCUMENT
 * =======================================================*/
export interface IDocumentNumberConfig extends Document {
  businessId: string;
  documentType: DocumentType;

  // Format building blocks
  prefix: string;            // e.g. "INV", "PO", "GRN"
  separator: string;         // default "-"
  includeFinancialYear: boolean; // e.g. "2024-25"
  includeMonth: boolean;     // e.g. "06"
  sequenceLength: number;    // zero-pad length, default 4
  suffix: string;            // optional suffix after sequence

  // Control
  startFrom: number;         // reset/start from this number
  isActive: boolean;

  // Computed preview (stored for display, recalculated on save)
  formatPreview: string;     // e.g. "INV-2024-25-0001"

  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
 * SCHEMA
 * =======================================================*/
const DocumentNumberConfigSchema = new Schema<IDocumentNumberConfig>(
  {
    businessId: { type: String, required: true, index: true },
    documentType: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
    },
    prefix: { type: String, default: "" },
    separator: { type: String, default: "-" },
    includeFinancialYear: { type: Boolean, default: true },
    includeMonth: { type: Boolean, default: false },
    sequenceLength: { type: Number, default: 4, min: 1, max: 8 },
    suffix: { type: String, default: "" },
    startFrom: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    formatPreview: { type: String, default: "" },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true, versionKey: false }
);

DocumentNumberConfigSchema.index(
  { businessId: 1, documentType: 1 },
  { unique: true }
);

/* =========================================================
 * MODEL
 * =======================================================*/
const DocumentNumberConfig: Model<IDocumentNumberConfig> =
  (mongoose.models.DocumentNumberConfig as Model<IDocumentNumberConfig>) ||
  mongoose.model<IDocumentNumberConfig>(
    "DocumentNumberConfig",
    DocumentNumberConfigSchema
  );

export default DocumentNumberConfig;
