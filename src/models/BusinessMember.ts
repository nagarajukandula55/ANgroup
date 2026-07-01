import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
export type MemberType =
  | 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'EMPLOYEE'
  | 'VENDOR' | 'VENDOR_WAREHOUSE' | 'VENDOR_HELPER'
  | 'VENDOR_PACKER' | 'VENDOR_DELIVERY' | 'VENDOR_LOGISTICS'
  | 'CUSTOMER';

export interface IBusinessMember extends Document {
  userId: Types.ObjectId;
  businessId: Types.ObjectId;
  status: MemberStatus;
  memberType: MemberType;
  role?: string;
  isDefaultBusiness: boolean;
  joinedAt: Date;
  invitedBy?: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessMemberSchema = new Schema<IBusinessMember>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    memberType: {
      type: String,
      enum: ['OWNER','ADMIN','MANAGER','STAFF','EMPLOYEE','VENDOR',
        'VENDOR_WAREHOUSE','VENDOR_HELPER','VENDOR_PACKER',
        'VENDOR_DELIVERY','VENDOR_LOGISTICS','CUSTOMER'],
      default: 'STAFF',
    },
    role:               { type: String, default: null },
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
