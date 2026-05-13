import mongoose, { Schema, Document, Model } from "mongoose";

/* ================= USER INTERFACE ================= */
export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;

  password?: string;

  isActive: boolean;
  isEmailVerified: boolean;

  role: "SUPER_ADMIN" | "ADMIN" | "STAFF" | "CUSTOMER";

  businessAccess: {
    businessId: string;
    accessKeys: string[];
    isActive: boolean;
  }[];

  lastLogin?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/* ================= USER SCHEMA ================= */
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },

    password: { type: String, select: false, required: true },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN", "STAFF", "CUSTOMER"],
      default: "CUSTOMER",
    },

    businessAccess: [
      {
        businessId: { type: String, required: true },
        accessKeys: [{ type: String }],
        isActive: { type: Boolean, default: true },
      },
    ],

    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

/* ================= MODEL EXPORT SAFETY ================= */
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default mongoose.models.User ||
  mongoose.model("User", UserSchema);
