import mongoose from "mongoose";

const AssetSchema = new mongoose.Schema(
  {
    name: String,

    category: {
      type: String,
      enum: [
        "logo",
        "product-image",
        "icon",
        "certification",
        "background",
        "shape",
      ],
    },

    fileUrl: String,

    thumbnailUrl: String,

    fileType: String,

    size: Number,

    tags: [String],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Asset ||
  mongoose.model("Asset", AssetSchema);
