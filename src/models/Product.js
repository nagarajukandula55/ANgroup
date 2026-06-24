import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    productCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
    },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },

    shortDescription: String,

    description: String,

    images: [String],

    bomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BOM",
    },

    hsnCode: String,

    gstRate: {
      type: Number,
      default: 0,
    },

    tags: [String],

    seoTitle: String,

    seoDescription: String,

    active: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "ACTIVE",
        "INACTIVE",
      ],
      default: "DRAFT",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
