/**
 * DocumentCounter — atomic sequence counter for auto-incrementing document numbers.
 *
 * Usage:
 *   import DocumentCounter from "@/models/DocumentCounter";
 *
 *   const counter = await DocumentCounter.findOneAndUpdate(
 *     { _id: "invoiceNumber" },
 *     { $inc: { seq: 1 } },
 *     { upsert: true, new: true }
 *   );
 *   const nextNumber = counter.seq;
 *
 * No files currently import this model (per import audit). It is provided here
 * as the canonical TypeScript version. A DocumentCounter.js file (if it existed)
 * should be removed; it cannot be reliably re-exported via CommonJS from a TS module
 * in a Next.js project, and the JS variant was not imported anywhere.
 */

import mongoose, { Schema, Model, Document } from "mongoose";

export interface IDocumentCounter extends Document {
  _id: string; // counter name, e.g. "invoiceNumber", "poNumber"
  seq: number;
}

const DocumentCounterSchema = new Schema<IDocumentCounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  {
    // No timestamps needed — counters are updated atomically
    _id: false,
  }
);

const DocumentCounter: Model<IDocumentCounter> =
  (mongoose.models.DocumentCounter as Model<IDocumentCounter>) ||
  mongoose.model<IDocumentCounter>("DocumentCounter", DocumentCounterSchema);

export default DocumentCounter;
