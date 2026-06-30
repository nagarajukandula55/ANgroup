import mongoose, { Schema, Model, Document } from "mongoose";

/* =========================================================
 * SUPPORTED DOCUMENT TYPES
 * =======================================================*/
export const DOCUMENT_TYPES = [
  "INVOICE",
  "SALES_ORDER",
  "PURCHASE_ORDER",
  "GRN",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
  "QUOTATION",
  "DELIVERY_CHALLAN",
  "PAYMENT_RECEIPT",
  "PRODUCTION_ORDER",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

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
