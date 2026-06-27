import mongoose, { Document, Model, Schema, Types } from "mongoose";

/* =========================================================
 * DOCUMENT
 * =======================================================*/

export interface IUserRole extends Document {
  userId: Types.ObjectId;

  roleId: Types.ObjectId;

  businessMemberId: Types.ObjectId;

  assignedBy?: Types.ObjectId;

  assignedAt: Date;

  expiresAt?: Date;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
 * SCHEMA
 * =======================================================*/

const UserRoleSchema = new Schema<IUserRole>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },

    businessMemberId: {
      type: Schema.Types.ObjectId,
      ref: "BusinessMember",
      required: true,
      index: true,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =========================================================
 * INDEXES
 * =======================================================*/

UserRoleSchema.index(
  {
    userId: 1,
    roleId: 1,
    businessMemberId: 1,
  },
  {
    unique: true,
  }
);

UserRoleSchema.index({
  roleId: 1,
});

UserRoleSchema.index({
  businessMemberId: 1,
});

/* =========================================================
 * MODEL
 * =======================================================*/

const UserRole: Model<IUserRole> =
  mongoose.models.UserRole ||
  mongoose.model<IUserRole>("UserRole", UserRoleSchema);

export default UserRole;
