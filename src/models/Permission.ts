import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPermission extends Document {
  code:        string;
  name:        string;
  description: string;
  group:       string;
  isActive:    boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    group:       { type: String, default: 'GENERAL', index: true },
    isActive:    { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

PermissionSchema.index({ code: 1 });
PermissionSchema.index({ group: 1, isActive: 1 });

const Permission: Model<IPermission> =
  mongoose.models.Permission || mongoose.model<IPermission>('Permission', PermissionSchema);

export default Permission;
