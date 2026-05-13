import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },

    phone: {
      type: String,
      index: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      default: "CUSTOMER",
      enum: ["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"],
    },

    access: {
      type: [String], // future access-based system (NOT role-based)
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: Date,

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User ||
  mongoose.model("User", UserSchema);
