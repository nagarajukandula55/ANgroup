/**
 * @deprecated UserAccess is deprecated and has no active API routes or imports.
 *
 * The canonical model for user business membership and access control is
 * UserBusinessAccess (src/models/UserBusinessAccess.ts), which is actively
 * used by the admin access API routes.
 *
 * This file is kept for backwards compatibility only. Do NOT add new code here.
 * If you need to manage user access to businesses, import from:
 *   import UserBusinessAccess from "@/models/UserBusinessAccess";
 */

import mongoose, { Schema, Model, Document } from "mongoose";

/** @deprecated Use UserBusinessAccess instead */
export interface IUserAccess extends Document {
  userId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  role: string;
  permissions: string[];
  grantedAt: Date;
  grantedBy?: mongoose.Types.ObjectId;
}

/** @deprecated Use UserBusinessAccess instead */
const UserAccessSchema = new Schema<IUserAccess>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    businessId: { type: Schema.Types.ObjectId, required: true, ref: "Business" },
    role: { type: String, default: "member" },
    permissions: [{ type: String }],
    grantedAt: { type: Date, default: Date.now },
    grantedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

/** @deprecated Use UserBusinessAccess instead */
const UserAccess: Model<IUserAccess> =
  (mongoose.models.UserAccess as Model<IUserAccess>) ||
  mongoose.model<IUserAccess>("UserAccess", UserAccessSchema);

export default UserAccess;
