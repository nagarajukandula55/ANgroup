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

export type ServiceCenterBOMPartType = "SPARE_PART" | "LABOUR" | "CONSUMABLE";

export interface IServiceCenterBOM extends Document {
  businessId: Types.ObjectId;
  vendorId: Types.ObjectId;
  brandId?: Types.ObjectId; // ref Brand -- which device brand this part fits, if any
  // Which Series this part fits, if any -- lets a part be scoped to a whole
  // product line (e.g. "any Galaxy S phone") without pinning it to one
  // exact deviceModelId. Denormalized here (rather than requiring a join
  // through DeviceModel) purely so GET /api/service-center-bom can filter
  // on it directly; auto-set from deviceModelId's own seriesId whenever a
  // deviceModelId is chosen, so the two never disagree.
  seriesId?: Types.ObjectId; // ref Series
  // Which specific device model this part fits, if any -- optional and
  // nested under brandId (a part can be brand-wide/"Any Model" with this
  // unset, or scoped to one exact model). Together with brandId this is
  // the Brand -> Model -> Part tree the management page organizes parts
  // by, per explicit direction.
  deviceModelId?: Types.ObjectId; // ref DeviceModel
  partName: string;
  partCode: string;
  description?: string; // spec/detail beyond the name, for GST-invoice line clarity
  partType: ServiceCenterBOMPartType;
  unit: string; // e.g. "pcs", "nos", "set"
  hsnCode: string;
  gstRate: number; // % -- explicit on the part, not just derived from HSN lookup at billing time
  rate: number; // without tax
  warrantyDays?: number;
  // Optional link to a real Inventory-tracked Material -- only consulted
  // when the business has Business.inventorySerialized = true; lets the
  // workorder repair flow check real stock before allowing this part to be
  // added, and deduct on close. When unset (the default), this part
  // behaves exactly as before -- a plain price-list entry with no stock
  // tracking.
  materialId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceCenterBOMSchema = new Schema<IServiceCenterBOM>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "VendorProfile", required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", index: true },
    seriesId: { type: Schema.Types.ObjectId, ref: "Series", index: true },
    deviceModelId: { type: Schema.Types.ObjectId, ref: "DeviceModel", index: true },
    partName: { type: String, required: true, trim: true },
    partCode: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    partType: { type: String, enum: ["SPARE_PART", "LABOUR", "CONSUMABLE"], default: "SPARE_PART" },
    unit: { type: String, trim: true, default: "pcs" },
    hsnCode: { type: String, required: true, trim: true },
    gstRate: { type: Number, required: true, min: 0, max: 100, default: 18 },
    rate: { type: Number, required: true, min: 0 },
    warrantyDays: { type: Number, min: 0 },
    materialId: { type: Schema.Types.ObjectId, ref: "Material", default: null },
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
