import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRole extends Document {
  name: string;
  code: string;
  description: string;
  color: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name:        { type: String, required: true, trim: true },
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    color:       { type: String, default: '#60a5fa' },
    isSystem:    { type: Boolean, default: false },
    permissions: [{ type: String }],
  },
  { timestamps: true, versionKey: false }
);

RoleSchema.index({ code: 1 });

const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

export default Role;
