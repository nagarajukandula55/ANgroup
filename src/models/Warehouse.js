import mongoose from "mongoose";

const WarehouseSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
    },

    // Optional — a warehouse is either owned directly by a business, OR by
    // one specific vendor operating under that business (hierarchy: AN
    // Group > Businesses > Vendors > Warehouses > Staff). When set, this
    // warehouse belongs to the vendor's own operation and should only be
    // visible/manageable from that vendor's portal, not the business's
    // general warehouse list.
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorProfile",
      default: null,
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
