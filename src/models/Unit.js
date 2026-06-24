import mongoose from "mongoose";

const UnitSchema = new mongoose.Schema(
{
  unitCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },

  unitName: {
    type: String,
    required: true,
  },

  unitType: {
    type: String,
    enum: [
      "WEIGHT",
      "VOLUME",
      "COUNT",
      "LENGTH",
      "AREA",
    ],
    required: true,
  },

  baseUnit: {
    type: String,
    default: null,
  },

  conversionFactor: {
    type: Number,
    default: 1,
  },

  decimalAllowed: {
    type: Boolean,
    default: true,
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

export default mongoose.models.Unit ||
mongoose.model("Unit", UnitSchema);
