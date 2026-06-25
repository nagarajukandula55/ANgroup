import mongoose from "mongoose";

const ProductVariantSchema =
new mongoose.Schema(
{
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  variantCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },

  variantName: {
    type: String,
    required: true,
  },

  size: String,

  unit: String,

  sku: {
    type: String,
    required: true,
    unique: true,
  },

  barcode: String,

  mrp: {
    type: Number,
    default: 0,
  },

  sellingPrice: {
    type: Number,
    default: 0,
  },

  currentCost: {
    type: Number,
    default: 0,
  },

  safeCost: {
    type: Number,
    default: 0,
  },

  worstCaseCost: {
    type: Number,
    default: 0,
  },

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
