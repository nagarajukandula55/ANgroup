import mongoose from "mongoose";

const ProductVariantSchema =
new mongoose.Schema(
{
  fgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FinishedGood",
    required: true,
  },

  variantCode: {
    type: String,
    required: true,
    unique: true,
  },

  sku: {
    type: String,
    required: true,
    unique: true,
  },

  barcode: String,

  qrCode: String,

  weight: Number,

  unit: String,

  mrp: Number,

  sellingPrice: Number,

  active: {
    type: Boolean,
    default: true,
  },
},
{
  timestamps: true,
}
);

export default mongoose.models.ProductVariant ||
mongoose.model(
  "ProductVariant",
  ProductVariantSchema
);
