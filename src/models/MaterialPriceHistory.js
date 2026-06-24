import mongoose from "mongoose";

const MaterialPriceHistorySchema =
new mongoose.Schema(
{
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Material",
    required: true,
  },

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
  },

  price: {
    type: Number,
    required: true,
  },

  effectiveDate: {
    type: Date,
    required: true,
  },

  remarks: String,
},
{
  timestamps: true,
}
);

export default mongoose.models.MaterialPriceHistory ||
mongoose.model(
  "MaterialPriceHistory",
  MaterialPriceHistorySchema
);
