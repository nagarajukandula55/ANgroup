import mongoose from "mongoose";

const BrandSchema = new mongoose.Schema(
  {
    brandCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    brandName: {
      type: String,
      required: true,
      trim: true,
    },

    logo: String,

    description: String,

    website: String,

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Brand ||
  mongoose.model("Brand", BrandSchema);
