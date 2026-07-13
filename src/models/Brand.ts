import mongoose, { Schema, Model, Document } from "mongoose";
import { BUSINESS_SCOPES, type BusinessScope } from "@/core/catalog/businessScope";

export interface IBrand extends Document {
  name: string;
  description?: string;
  // Optional parent brand -- lets a business branch brands the same way
  // ProductCategory/MaterialCategory already do (e.g. a "Mobile" group
  // with its own set of logo entries under it, a separate "Laptops"
  // group with its own). Self-referencing, same pattern as
  // ProductCategory.parentId.
  parentId?: mongoose.Types.ObjectId | null;
  businessId: mongoose.Types.ObjectId;
  // Business tagging: SINGLE (default) = businessId only, MULTIPLE = also
  // visible to every business in businessIds, ALL = visible everywhere.
  // See core/catalog/businessScopeFilter.ts for the query this backs.
  businessScope: BusinessScope;
  businessIds: mongoose.Types.ObjectId[];
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true },
    description: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: "Brand", default: null },
    businessId: { type: Schema.Types.ObjectId, required: true },
    businessScope: { type: String, enum: BUSINESS_SCOPES, default: "SINGLE" },
    businessIds: [{ type: Schema.Types.ObjectId, ref: "Business" }],
    logoUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BrandSchema.index({ businessId: 1, isActive: 1 });
BrandSchema.index({ businessId: 1, name: 1 }, { unique: true });

const Brand: Model<IBrand> =
  (mongoose.models.Brand as Model<IBrand>) ||
  mongoose.model<IBrand>("Brand", BrandSchema);

export default Brand;
