import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMembership extends Document {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  businessId: Types.ObjectId;

  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";

  warehouseIds: Types.ObjectId[];

  isDefault: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"],
      default: "VIEWER",
    },

    warehouseIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
      },
    ],

    isDefault: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   INDEXES
========================================================= */

MembershipSchema.index({ userId: 1, organizationId: 1 });
MembershipSchema.index({ userId: 1, businessId: 1 });

const Membership: Model<IMembership> =
  mongoose.models.Membership ||
  mongoose.model<IMembership>("Membership", MembershipSchema);

export default Membership;
