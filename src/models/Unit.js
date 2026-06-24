import mongoose from "mongoose";

const UnitSchema = new mongoose.Schema(
  {
    unitCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    unitName: {
      type: String,
      required: true,
      trim: true,
    },

    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    unitType: {
      type: String,
      enum: [
        "WEIGHT",
        "VOLUME",
        "COUNT",
        "LENGTH",
        "AREA",
        "TIME",
        "PACKAGING",
      ],
      required: true,
    },

    baseUnit: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },

    conversionFactor: {
      type: Number,
      default: 1,
      min: 0,
    },

    decimalAllowed: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    description: {
      type: String,
      default: "",
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
