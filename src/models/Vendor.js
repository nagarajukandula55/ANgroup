import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
    },

    /* ==========================================
       BASIC DETAILS
    ========================================== */

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

    /* ==========================================
       ROLE
    ========================================== */

    vendorRole: {
      type: String,
      enum: [
        "SUPPLIER",
        "SELLER",
        "BOTH",
      ],
      default: "SUPPLIER",
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

    /* ==========================================
       TAX
    ========================================== */

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

    /* ==========================================
       CONTACT
    ========================================== */

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

    /* ==========================================
       ADDRESS
    ========================================== */

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

    /* ==========================================
       PROCUREMENT
    ========================================== */

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

    creditLimit: {
      type: Number,
      default: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    /* ==========================================
       BANK
    ========================================== */

    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      branchName: String,
      ifscCode: String,
      upiId: String,
    },

    /* ==========================================
       MARKETPLACE
    ========================================== */

    portalAccess: {
      type: Boolean,
      default: false,
    },

    websiteVisible: {
      type: Boolean,
      default: true,
    },

    sellerCommissionType: {
      type: String,
      enum: [
        "PERCENTAGE",
        "FIXED",
      ],
    },

    sellerCommissionValue: {
      type: Number,
      default: 0,
    },

    /* ==========================================
       APPROVAL
    ========================================== */

    approvalStatus: {
      type: String,
      enum: [
        "PENDING",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
      ],
      default: "PENDING",
    },

    approvedAt: Date,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectionReason: String,

    /* ==========================================
       DOCUMENTS
    ========================================== */

    documents: [
      {
        documentType: {
          type: String,
          enum: [
            "GST",
            "PAN",
            "FSSAI",
            "TRADE_LICENSE",
            "CANCELLED_CHEQUE",
            "OTHER",
          ],
        },

        fileName: String,
        fileUrl: String,

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    /* ==========================================
       STATUS
    ========================================== */

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
VendorSchema.index({ vendorRole: 1 });
VendorSchema.index({ approvalStatus: 1 });

export default mongoose.models.Vendor ||
  mongoose.model("Vendor", VendorSchema);
