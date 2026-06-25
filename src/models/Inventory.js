import mongoose from "mongoose";

const InventorySchema =
new mongoose.Schema(
{
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    required: true,
  },

  itemType: {
    type: String,
    enum: [
      "MATERIAL",
      "PRODUCT",
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

  reorderLevel: {
    type: Number,
    default: 0,
  },

  reorderQuantity: {
    type: Number,
    default: 0,
  },
},
{
  timestamps: true,
}
);

export default mongoose.models.Inventory ||
mongoose.model(
  "Inventory",
  InventorySchema
);
