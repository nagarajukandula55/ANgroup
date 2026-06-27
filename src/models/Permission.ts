import mongoose, { Document, Model, Schema, Types } from "mongoose";

/* =========================================================
 * ENUMS
 * =======================================================*/

export enum PermissionType {
  SYSTEM = "SYSTEM",
  CUSTOM = "CUSTOM",
}

export enum PermissionStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

/* =========================================================
 * DOCUMENT
 * =======================================================*/

export interface IPermission extends Document {
  organizationId?: Types.ObjectId;

  module: string;

  group: string;

  name: string;

  code: string;

  description?: string;

  type: PermissionType;

  status: PermissionStatus;

  isProtected: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
 * SCHEMA
 * =======================================================*/

const PermissionSchema = new Schema<IPermission>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },

    module: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    group: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    description: {
      type: String,
      default: null,
      trim: true,
    },

    type: {
      type: String,
      enum: Object.values(PermissionType),
      default: PermissionType.SYSTEM,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(PermissionStatus),
      default: PermissionStatus.ACTIVE,
      index: true,
    },

    isProtected: {
      type: Boolean,
      default: true,
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

PermissionSchema.index(
  {
    module: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

PermissionSchema.index({
  module: 1,
  group: 1,
});

PermissionSchema.index({
  status: 1,
});

PermissionSchema.index({
  type: 1,
});

/* =========================================================
 * MODEL
 * =======================================================*/

const Permission: Model<IPermission> =
  mongoose.models.Permission ||
  mongoose.model<IPermission>("Permission", PermissionSchema);

export default Permission;
