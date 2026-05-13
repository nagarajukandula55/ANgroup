import mongoose from "mongoose";

const SequenceSchema = new mongoose.Schema(
  {
    businessId: { type: String, index: true },

    type: {
      type: String,
      enum: ["INVOICE", "RECEIPT"],
      required: true,
    },

    dateKey: String, // e.g. 260430

    value: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

SequenceSchema.index(
  { businessId: 1, type: 1, dateKey: 1 },
  { unique: true }
);

export default mongoose.models.Sequence ||
  mongoose.model("Sequence", SequenceSchema);
