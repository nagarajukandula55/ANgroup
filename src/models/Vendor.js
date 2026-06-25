import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
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

    contactPerson: {
      type: String,
      trim: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    alternateMobile: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    website: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    district: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    pincode: {
      type: String,
      trim: true,
    },

    country: {
      type: String,
      default: "India",
      trim: true,
    },

    paymentTermsDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    leadTimeDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    minimumOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      branchName: String,
      ifscCode: String,
      upiId: String,
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "INACTIVE",
        "BLACKLISTED",
      ],
      default: "ACTIVE",
    },

    notes: {
      type: String,
      trim: true,
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

VendorSchema.index({ vendorCode: 1 });
VendorSchema.index({ vendorName: 1 });
VendorSchema.index({ gstin: 1 });

export default mongoose.models.Vendor ||
  mongoose.model("Vendor", VendorSchema);
