import mongoose from "mongoose";

const MaterialCategorySchema = new mongoose.Schema(
{
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },

  categoryCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },

  categoryName: {
    type: String,
    required: true,
    trim: true,
  },

  parentCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MaterialCategory",
    default: null,
  },

  description: String,

  active: {
    type: Boolean,
    default: true,
  },
},
{
  timestamps: true,
}
);

export default mongoose.models.MaterialCategory ||
mongoose.model("MaterialCategory", MaterialCategorySchema);
