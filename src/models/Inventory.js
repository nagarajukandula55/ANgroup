import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },

    itemType: {
      type: String,
      enum: [
        "MATERIAL",
        "PRODUCT_VARIANT",
      ],
      required: true,
    },

    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
    },

    productVariantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
    },

    quantity: {
      type: Number,
      default: 0,
    },

    reservedQuantity: {
      type: Number,
      default: 0,
    },

    availableQuantity: {
      type: Number,
      default: 0,
    },

    averageCost: {
      type: Number,
      default: 0,
    },

    totalValue: {
      type: Number,
      default: 0,
    },

    reorderLevel: {
      type: Number,
      default: 0,
    },

    reorderQuantity: {
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

InventorySchema.index({
  warehouseId: 1,
  materialId: 1,
});

InventorySchema.index({
  warehouseId: 1,
  productVariantId: 1,
});

export default mongoose.models.Inventory ||
  mongoose.model(
    "Inventory",
    InventorySchema
  );
