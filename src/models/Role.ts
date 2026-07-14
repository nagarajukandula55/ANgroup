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
  vendorId?:       Types.ObjectId;
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
  // Which page a user holding this role lands on right after login (e.g.
  // "/admin/crm" or "/vendor/dashboard"). Empty/unset falls back to the
  // existing default-per-account-type redirect logic.
  homeRoute?:      string;
  // Optional custom ordering of sidebar module keys for users holding this
  // role -- lets an admin re-arrange/nest the nav for a role (e.g. put CRM
  // Overview above Appointments/Workorders) without touching every other
  // role's layout. Missing/empty falls back to the built-in NAV_GROUPS order.
  moduleOrder?:    string[];
  createdBy?:      Types.ObjectId;
  createdAt:       Date;
  updatedAt:       Date;
}

const RoleSchema = new Schema<IRole>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization',    default: null },
    businessId:     { type: Schema.Types.ObjectId, ref: 'Business',       default: null },
    // Scopes a role to one vendor's team (e.g. that vendor's own "Owner"/
    // "Manager" default roles) -- null for platform-wide and business-wide
    // roles. Combined with businessId in the compound unique index below so
    // every vendor can have its own "VENDOR_OWNER"-coded role without
    // colliding with any other vendor's.
    vendorId:       { type: Schema.Types.ObjectId, ref: 'VendorProfile',  default: null },
    name:           { type: String, required: true, trim: true },
    // Not globally unique -- vendor-scoped default roles intentionally reuse
    // the same code (e.g. "VENDOR_OWNER") across every vendor. Uniqueness is
    // enforced by the compound index on {code, businessId, vendorId} below.
    code:           { type: String, required: true, uppercase: true, trim: true },
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
    homeRoute:   { type: String, default: '' },
    moduleOrder: [{ type: String }],
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

RoleSchema.index({ code: 1, businessId: 1, vendorId: 1 }, { unique: true });
RoleSchema.index({ organizationId: 1, status: 1 });
RoleSchema.index({ businessId: 1, vendorId: 1, status: 1 });

const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>('Role', RoleSchema);

export default Role;
