import mongoose from "mongoose";

const InventoryLotSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
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

      lotNumber: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
      },

      batchNumber: {
        type: String,
        uppercase: true,
        trim: true,
      },

      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },

      goodsReceiptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GoodsReceipt",
      },

      manufacturingOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductionOrder",
      },

      manufacturingDate: Date,

      expiryDate: Date,

      receivedDate: {
        type: Date,
        default: Date.now,
      },

      quantity: {
        type: Number,
        required: true,
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

      unitCost: {
        type: Number,
        default: 0,
      },

      totalValue: {
        type: Number,
        default: 0,
      },

      qualityStatus: {
        type: String,
        enum: [
          "PENDING_QC",
          "APPROVED",
          "REJECTED",
          "HOLD",
        ],
        default: "APPROVED",
      },

      remarks: String,

      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

/* =========================================================
   INDEXES
========================================================= */

InventoryLotSchema.index({
  warehouseId: 1,
  lotNumber: 1,
});

InventoryLotSchema.index({
  materialId: 1,
  expiryDate: 1,
});

InventoryLotSchema.index({
  productVariantId: 1,
  expiryDate: 1,
});

InventoryLotSchema.index({
  qualityStatus: 1,
});

export default mongoose.models.InventoryLot ||
  mongoose.model(
    "InventoryLot",
    InventoryLotSchema
  );
