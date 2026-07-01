import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPermission extends Document {
  code:        string;
  name:        string;
  description: string;
  module:      string;   /* top-level module grouping, e.g. "SALES", "HR" */
  group:       string;   /* sub-group within a module, e.g. "Invoices" */
  status:      string;   /* "ACTIVE" | "INACTIVE" */
  isActive:    boolean;
  isDeleted:   boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    module:      { type: String, default: 'GENERAL', index: true },
    group:       { type: String, default: 'GENERAL', index: true },
    status:      { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
    isActive:    { type: Boolean, default: true, index: true },
    isDeleted:   { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

PermissionSchema.index({ code: 1 });
PermissionSchema.index({ module: 1, group: 1, status: 1 });

const Permission: Model<IPermission> =
  mongoose.models.Permission || mongoose.model<IPermission>('Permission', PermissionSchema);

export default Permission;
