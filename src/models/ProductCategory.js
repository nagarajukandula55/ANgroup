import mongoose from "mongoose";

const ProductCategorySchema = new mongoose.Schema(
  {
    categoryCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    categoryName: {
      type: String,
      required: true,
      trim: true,
    },

    categoryShortName: {
      type: String,
      trim: true,
    },

    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      default: null,
    },

    image: String,

    description: String,

    sortOrder: {
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

export default mongoose.models.ProductCategory ||
  mongoose.model("ProductCategory", ProductCategorySchema);
