import mongoose from "mongoose";

const UserAccessSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },

    accessKeys: {
      type: [String],
      default: [],
    },

    // optional grouping (future AI analysis)
    groups: [String],
  },
  { timestamps: true }
);

export default mongoose.models.UserAccess ||
  mongoose.model("UserAccess", UserAccessSchema);
