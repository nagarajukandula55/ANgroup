import mongoose from "mongoose";

const DocumentCounterSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: String,
        required: true,
        index: true,
      },

      documentType: {
        type: String,
        required: true,
        index: true,
      },

      financialYear: {
        type: String,
        required: true,
        index: true,
      },

      prefix: {
        type: String,
        default: "NA",
      },

      current: {
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

    financialYear: 1,
  },
  {
    unique: true,
  }
);

export default
  mongoose.models.DocumentCounter ||
  mongoose.model(
    "DocumentCounter",
    DocumentCounterSchema
  );
