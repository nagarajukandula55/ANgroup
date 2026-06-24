import mongoose from "mongoose";

const MaterialCategorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

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
      ref: "MaterialCategory",
      default: null,
    },

    categoryType: {
      type: String,
      enum: [
        "RAW_MATERIAL",
        "PACKAGING_MATERIAL",
        "CONSUMABLE",
        "SEMI_FINISHED",
        "SERVICE",
      ],
      default: "RAW_MATERIAL",
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    image: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
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

export default mongoose.models.MaterialCategory ||
  mongoose.model("MaterialCategory", MaterialCategorySchema);
