import mongoose from "mongoose";

const BOMItemSchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      required: true,
    },

    wastagePercent: {
      type: Number,
      default: 0,
      min: 0,
    },

    isOptional: {
      type: Boolean,
      default: false,
    },

    remarks: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const BOMSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    bomCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },

    version: {
      type: Number,
      default: 1,
    },

    batchSize: {
      type: Number,
      default: 1,
      min: 0,
    },

    batchUnit: {
      type: String,
      default: "KG",
    },

    items: {
      type: [BOMItemSchema],
      default: [],
    },

    notes: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "APPROVED",
        "INACTIVE",
      ],
      default: "DRAFT",
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

BOMSchema.index({
  productId: 1,
  version: -1,
});

export default mongoose.models.BOM ||
  mongoose.model("BOM", BOMSchema);
