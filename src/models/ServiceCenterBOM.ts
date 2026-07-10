/**
 * ServiceCenterBOM — a THIRD, distinct BOM type from the manufacturing
 * src/models/BOM.js and the vendor-onboarding src/models/VendorProductBOM.js.
 * This one is specific to service-center / CRM estimation & invoicing: a
 * vendor's own price list of repair parts (partName, auto-generated
 * partCode, hsnCode, rate-without-tax) used to give customers estimates and
 * to auto-fill CrmJobSheet line items at close time.
 *
 * Every entry carries BOTH a businessId and a vendorId ("business tag and
 * vendor tag") so a vendor's part list is private to them within their
 * business, per the spec ("this BOM should be available to that particular
 * partner who had made [it]").
 */

import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface IServiceCenterBOM extends Document {
  businessId: Types.ObjectId;
  vendorId: Types.ObjectId;
  partName: string;
  partCode: string;
  hsnCode: string;
  rate: number; // without tax
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceCenterBOMSchema = new Schema<IServiceCenterBOM>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "VendorProfile", required: true, index: true },
    partName: { type: String, required: true, trim: true },
    partCode: { type: String, required: true, trim: true },
    hsnCode: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ServiceCenterBOMSchema.index({ businessId: 1, vendorId: 1, partCode: 1 }, { unique: true });
ServiceCenterBOMSchema.index({ businessId: 1, vendorId: 1, isActive: 1 });

const ServiceCenterBOM: Model<IServiceCenterBOM> =
  (mongoose.models.ServiceCenterBOM as Model<IServiceCenterBOM>) ||
  mongoose.model<IServiceCenterBOM>("ServiceCenterBOM", ServiceCenterBOMSchema);

export default ServiceCenterBOM;
