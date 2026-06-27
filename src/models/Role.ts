import mongoose, { Document, Model, Schema, Types } from "mongoose";

/* =========================================================
 * ENUMS
 * =======================================================*/

export enum RoleType {
  SYSTEM = "SYSTEM",
  CUSTOM = "CUSTOM",
}

export enum RoleStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

/* =========================================================
 * DOCUMENT
 * =======================================================*/

export interface IRole extends Document {
  organizationId: Types.ObjectId;

  businessId?: Types.ObjectId;

  name: string;

  code: string;

  description?: string;

  type: RoleType;

  status: RoleStatus;

  priority: number;

  isDefault: boolean;

  isProtected: boolean;

  createdBy?: Types.ObjectId;

  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
 * SCHEMA
 * =======================================================*/

const RoleSchema = new Schema<IRole>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      default: null,
      trim: true,
    },

    type: {
      type: String,
      enum: Object.values(RoleType),
      default: RoleType.CUSTOM,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(RoleStatus),
      default: RoleStatus.ACTIVE,
      index: true,
    },

    priority: {
      type: Number,
      default: 100,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    isProtected: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

RoleSchema.index(
  {
    organizationId: 1,
    businessId: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

RoleSchema.index({
  organizationId: 1,
  businessId: 1,
});

RoleSchema.index({
  type: 1,
});

RoleSchema.index({
  status: 1,
});

/* =========================================================
 * MODEL
 * =======================================================*/

const Role: Model<IRole> =
  mongoose.models.Role ||
  mongoose.model<IRole>("Role", RoleSchema);

export default Role;
