import mongoose, { Schema, Model, Document } from "mongoose";

export interface IBrand extends Document {
  name: string;
  description?: string;
  businessId: mongoose.Types.ObjectId;
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true },
    description: { type: String },
    businessId: { type: Schema.Types.ObjectId, required: true },
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
