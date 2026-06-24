import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
{
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },

  vendorCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },

  vendorName: {
    type: String,
    required: true,
  },

  gstin: String,

  contactPerson: String,

  mobile: String,

  email: String,

  address: String,

  city: String,

  state: String,

  country: {
    type: String,
    default: "India",
  },

  leadTimeDays: {
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

export default mongoose.models.Vendor ||
mongoose.model("Vendor", VendorSchema);
