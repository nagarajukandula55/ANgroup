import mongoose, { Schema, Document, Model, Types } from 'mongoose';

/* ── Runtime const object (used as BusinessMemberStatus.ACTIVE etc.) ── */
export const BusinessMemberStatus = {
  ACTIVE:    'ACTIVE',
  INACTIVE:  'INACTIVE',
  PENDING:   'PENDING',
  SUSPENDED: 'SUSPENDED',
} as const;

/* ── Types ────────────────────────────────────────────────────────────── */
export type BusinessMemberStatus = typeof BusinessMemberStatus[keyof typeof BusinessMemberStatus];

export type BusinessMemberType =
  | 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'EMPLOYEE'
  | 'VENDOR' | 'VENDOR_WAREHOUSE' | 'VENDOR_HELPER'
  | 'VENDOR_PACKER' | 'VENDOR_DELIVERY' | 'VENDOR_LOGISTICS'
  | 'CUSTOMER';

/* Keep old alias names for any files that still use them */
export type MemberStatus = BusinessMemberStatus;
export type MemberType   = BusinessMemberType;

export interface IBusinessMember extends Document {
  userId:            Types.ObjectId;
  businessId:        Types.ObjectId;
  status:            BusinessMemberStatus;
  memberType:        BusinessMemberType;
  role?:             string;
  isDefaultBusiness: boolean;
  joinedAt:          Date;
  invitedBy?:        Types.ObjectId;
  isDeleted:         boolean;
  createdAt:         Date;
  updatedAt:         Date;
}

const BusinessMemberSchema = new Schema<IBusinessMember>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    status: {
      type:    String,
      enum:    Object.values(BusinessMemberStatus),
      default: BusinessMemberStatus.ACTIVE,
      index:   true,
    },
    memberType: {
      type:    String,
      enum:    ['OWNER','ADMIN','MANAGER','STAFF','EMPLOYEE','VENDOR',
                'VENDOR_WAREHOUSE','VENDOR_HELPER','VENDOR_PACKER',
                'VENDOR_DELIVERY','VENDOR_LOGISTICS','CUSTOMER'],
      default: 'STAFF',
    },
    role:               { type: String,  default: null },
    isDefaultBusiness:  { type: Boolean, default: false },
    joinedAt:           { type: Date,    default: Date.now },
    invitedBy:          { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted:          { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

BusinessMemberSchema.index({ userId: 1, businessId: 1 }, { unique: true });
BusinessMemberSchema.index({ businessId: 1, status: 1 });

const BusinessMember: Model<IBusinessMember> =
  mongoose.models.BusinessMember ||
  mongoose.model<IBusinessMember>('BusinessMember', BusinessMemberSchema);

export default BusinessMember;
