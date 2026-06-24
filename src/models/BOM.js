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

    remarks: String,
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
      unique: true,
    },

    version: {
      type: Number,
      default: 1,
    },

    batchSize: {
      type: Number,
      default: 1,
    },

    items: [BOMItemSchema],

    notes: String,

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.BOM ||
  mongoose.model("BOM", BOMSchema);
