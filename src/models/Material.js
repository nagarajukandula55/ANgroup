import mongoose from "mongoose";

const NutritionSchema = new mongoose.Schema(
{
  energy: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  fiber: Number,
  sugar: Number,
  sodium: Number,
  calcium: Number,
  iron: Number,
},
{
  _id: false,
}
);

const MaterialSchema = new mongoose.Schema(
{
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },

  materialCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },

  materialName: {
    type: String,
    required: true,
  },

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MaterialCategory",
    required: true,
  },

  materialType: {
    type: String,
    enum: [
      "RAW_MATERIAL",
      "PACKAGING",
      "CONSUMABLE",
      "LABEL",
      "BOX",
    ],
    default: "RAW_MATERIAL",
  },

  unit: {
    type: String,
    required: true,
  },

  hsnCode: String,

  gstRate: {
    type: Number,
    default: 0,
  },

  description: String,

  nutrition: {
    type: NutritionSchema,
    default: {},
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

export default mongoose.models.Material ||
mongoose.model("Material", MaterialSchema);
