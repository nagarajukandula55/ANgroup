import mongoose from "mongoose";

const MaterialPriceSchema = new mongoose.Schema(
{
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Material",
    required: true,
  },

  currentPrice: {
    type: Number,
    required: true,
  },

  expectedPrice: {
    type: Number,
    default: 0,
  },

  worstCasePrice: {
    type: Number,
    default: 0,
  },

  averagePrice: {
    type: Number,
    default: 0,
  },

  lowestPrice: {
    type: Number,
    default: 0,
  },

  highestPrice: {
    type: Number,
    default: 0,
  },

  primaryVendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
  },

  effectiveDate: {
    type: Date,
    default: Date.now,
  },
},
{
  timestamps: true,
}
);

export default mongoose.models.MaterialPrice ||
mongoose.model("MaterialPrice", MaterialPriceSchema);
