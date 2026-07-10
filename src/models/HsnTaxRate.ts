/**
 * HsnTaxRate — simple HSN-code -> GST-rate lookup used to auto-fill the
 * tax% on a CrmJobSheet line item when a part is picked from
 * ServiceCenterBOM by its hsnCode. businessId-scoped, with a null
 * businessId meaning a global/platform default (falls back to these if a
 * business hasn't defined its own override for a given HSN code).
 *
 * NOTE: the seeded rates below are reasonable placeholders for common
 * electronics-repair HSN codes as of this writing — real HSN-to-GST-rate
 * mapping should be reviewed/confirmed by the business owner /
 * accountant, since GST rates and HSN classifications can change.
 */

import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface IHsnTaxRate extends Document {
  businessId?: Types.ObjectId | null;
  hsnCode: string;
  gstRate: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HsnTaxRateSchema = new Schema<IHsnTaxRate>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", default: null, index: true },
    hsnCode: { type: String, required: true, trim: true, index: true },
    gstRate: { type: Number, required: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

HsnTaxRateSchema.index({ businessId: 1, hsnCode: 1 }, { unique: true });

const HsnTaxRate: Model<IHsnTaxRate> =
  (mongoose.models.HsnTaxRate as Model<IHsnTaxRate>) ||
  mongoose.model<IHsnTaxRate>("HsnTaxRate", HsnTaxRateSchema);

export default HsnTaxRate;

// Placeholder starter set for common electronics-repair HSN codes — review before relying on it for compliance.
export const DEFAULT_HSN_TAX_RATES: Array<Pick<IHsnTaxRate, "hsnCode" | "gstRate" | "description">> = [
  { hsnCode: "8517", gstRate: 18, description: "Mobile phone parts & accessories" },
  { hsnCode: "8528", gstRate: 18, description: "TV / display panel parts" },
  { hsnCode: "8544", gstRate: 18, description: "Cables and wires" },
  { hsnCode: "8507", gstRate: 18, description: "Batteries" },
  { hsnCode: "8536", gstRate: 18, description: "Switches, connectors, relays" },
  { hsnCode: "8471", gstRate: 18, description: "Computer / laptop parts" },
  { hsnCode: "8518", gstRate: 18, description: "Speakers, microphones, headphones" },
  { hsnCode: "9999", gstRate: 18, description: "Generic service / labour charge" },
];
