import mongoose from "mongoose";

const WarehouseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

    warehouseCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    warehouseName: {
      type: String,
      required: true,
      trim: true,
    },

    warehouseType: {
      type: String,
      enum: [
        "RAW_MATERIAL",
        "FINISHED_GOODS",
        "DISTRIBUTION",
        "STORE",
        "PRODUCTION",
      ],
      default: "RAW_MATERIAL",
    },

    contactPerson: String,

    mobile: String,

    email: String,

    address: String,

    city: String,

    district: String,

    state: String,

    pincode: String,

    country: {
      type: String,
      default: "India",
    },

    managerName: String,

    capacity: {
      type: Number,
      default: 0,
    },

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

export default mongoose.models.Warehouse ||
  mongoose.model(
    "Warehouse",
    WarehouseSchema
  );
