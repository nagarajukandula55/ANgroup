import mongoose, { Document, Model, Schema, Types } from "mongoose";

/* =========================================================
 * DOCUMENT
 * =======================================================*/

export interface IRolePermission extends Document {
  roleId: Types.ObjectId;

  permissionId: Types.ObjectId;

  createdBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
 * SCHEMA
 * =======================================================*/

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },

    permissionId: {
      type: Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
      index: true,
    },

    createdBy: {
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

RolePermissionSchema.index(
  {
    roleId: 1,
    permissionId: 1,
  },
  {
    unique: true,
  }
);

RolePermissionSchema.index({
  permissionId: 1,
});

/* =========================================================
 * MODEL
 * =======================================================*/

const RolePermission: Model<IRolePermission> =
  mongoose.models.RolePermission ||
  mongoose.model<IRolePermission>(
    "RolePermission",
    RolePermissionSchema
  );

export default RolePermission;
