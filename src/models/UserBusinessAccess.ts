import mongoose from "mongoose";

const UserBusinessAccessSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    accessKeys: {
      type: [String],
      default: [],
    },

    designation: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

UserBusinessAccessSchema.index(
  { userId: 1, businessId: 1 },
  { unique: true }
);

export default mongoose.models.UserBusinessAccess ||
  mongoose.model(
    "UserBusinessAccess",
    UserBusinessAccessSchema
  );
