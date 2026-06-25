import mongoose from "mongoose";

const DocumentCounterSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
        required: true,
        index: true,
      },

      documentType: {
        type: String,
        required: true,
        index: true,
      },

      currentNumber: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

DocumentCounterSchema.index(
  {
    businessId: 1,
    documentType: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.models.DocumentCounter ||
  mongoose.model(
    "DocumentCounter",
    DocumentCounterSchema
  );
