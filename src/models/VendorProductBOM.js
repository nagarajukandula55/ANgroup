import mongoose from "mongoose";

const VendorProductBOMSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
      },

      vendorProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VendorProduct",
        required: true,
        index: true,
      },

      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
      },

      materialCode: {
        type: String,
      },

      materialName: {
        type: String,
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
      },

      currentRate: {
        type: Number,
        default: 0,
      },

      currentCost: {
        type: Number,
        default: 0,
      },

      // What this BOM line actually IS -- drives the Compliance step's
      // ingredient/percentage extraction (INGREDIENT rows only) and
      // packaging-material grouping. Defaults to INGREDIENT since most
      // existing rows were added before this field existed and are, in
      // practice, the product's actual composition rather than packaging.
      materialType: {
        type: String,
        enum: ["INGREDIENT", "PACKAGING", "OTHER"],
        default: "INGREDIENT",
      },

      remarks: {
        type: String,
        default: "",
      },

      active: {
        type: Boolean,
        default: true,
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

VendorProductBOMSchema.index({
  vendorProductId: 1,
});

VendorProductBOMSchema.index({
  materialId: 1,
});

VendorProductBOMSchema.index({
  vendorProductId: 1,
  materialId: 1,
});

export default
  mongoose.models.VendorProductBOM ||
  mongoose.model(
    "VendorProductBOM",
    VendorProductBOMSchema
  );
