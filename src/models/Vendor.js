import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },

    vendorCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    vendorName: {
      type: String,
      required: true,
      trim: true,
    },

    vendorShortName: {
      type: String,
      trim: true,
    },

    vendorType: {
      type: String,
      enum: [
        "RAW_MATERIAL",
        "PACKAGING",
        "SERVICE",
        "TRANSPORT",
        "MANUFACTURING",
        "GENERAL",
      ],
      default: "GENERAL",
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },

    pan: {
      type: String,
      trim: true,
      uppercase: true,
    },

    contactPerson: String,

    mobile: String,

    alternateMobile: String,

    email: String,

    website: String,

    address: String,

    city: String,

    district: String,

    state: String,

    pincode: String,

    country: {
      type: String,
      default: "India",
    },

    paymentTermsDays: {
      type: Number,
      default: 0,
    },

    leadTimeDays: {
      type: Number,
      default: 0,
    },

    minimumOrderValue: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
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

export default mongoose.models.Vendor ||
  mongoose.model("Vendor", VendorSchema);
