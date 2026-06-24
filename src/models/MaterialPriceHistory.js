import mongoose from "mongoose";

const MaterialPriceHistorySchema = new mongoose.Schema(
  {
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },

    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    priceUnit: {
      type: String,
      default: "KG",
    },

    effectiveDate: {
      type: Date,
      required: true,
    },

    source: {
      type: String,
      enum: [
        "MANUAL",
        "PURCHASE_ORDER",
        "IMPORT",
        "SYSTEM",
      ],
      default: "MANUAL",
    },

    remarks: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

MaterialPriceHistorySchema.index({
  materialId: 1,
  effectiveDate: -1,
});

MaterialPriceHistorySchema.index({
  materialId: 1,
  vendorId: 1,
  effectiveDate: -1,
});

export default mongoose.models.MaterialPriceHistory ||
  mongoose.model(
    "MaterialPriceHistory",
    MaterialPriceHistorySchema
  );
