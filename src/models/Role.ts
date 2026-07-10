import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/* ── Enums ────────────────────────────────────────────────────────────── */
export enum RoleType {
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}

export enum RoleStatus {
  ACTIVE   = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/* ── Interface ────────────────────────────────────────────────────────── */
export interface IRole extends Document {
  organizationId?: Types.ObjectId;
  businessId?:     Types.ObjectId;
  name:            string;
  code:            string;
  description:     string;
  color:           string;
  type:            RoleType;
  status:          RoleStatus;
  isSystem:        boolean;
  isDefault:       boolean;
  isProtected:     boolean;
  permissions:     string[];
  createdBy?:      Types.ObjectId;
  createdAt:       Date;
  updatedAt:       Date;
}

const RoleSchema = new Schema<IRole>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    businessId:     { type: Schema.Types.ObjectId, ref: 'Business',     default: null },
    name:           { type: String, required: true, trim: true },
    code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
    description:    { type: String, default: '' },
    color:          { type: String, default: '#60a5fa' },
    type: {
      type:    String,
      enum:    Object.values(RoleType),
      default: RoleType.CUSTOM,
    },
    status: {
      type:    String,
      enum:    Object.values(RoleStatus),
      default: RoleStatus.ACTIVE,
      index:   true,
    },
    isSystem:    { type: Boolean, default: false },
    isDefault:   { type: Boolean, default: false },
    isProtected: { type: Boolean, default: false },
    permissions: [{ type: String }],
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

// `code` already gets a unique index from the field's own `unique: true`
// above -- this duplicate .index({ code: 1 }) call produced Mongoose's
// "Duplicate schema index" warning on every boot.
RoleSchema.index({ organizationId: 1, status: 1 });
RoleSchema.index({ businessId: 1,     status: 1 });

const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

export default Role;
