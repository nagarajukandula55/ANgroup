import mongoose, { Document, Model, Schema, Types } from "mongoose";

/* =========================================================
 * ENUMS
 * =======================================================*/

export enum BusinessMemberType {
  OWNER = "OWNER",
  EMPLOYEE = "EMPLOYEE",
  VENDOR = "VENDOR",
  CUSTOMER = "CUSTOMER",
}

export enum BusinessMemberStatus {
  INVITED = "INVITED",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

/* =========================================================
 * DOCUMENT
 * =======================================================*/

export interface IBusinessMember extends Document {
  organizationId: Types.ObjectId;

  businessId: Types.ObjectId;

  userId: Types.ObjectId;

  employeeId?: Types.ObjectId;

  vendorId?: Types.ObjectId;

  customerId?: Types.ObjectId;

  memberType: BusinessMemberType;

  status: BusinessMemberStatus;

  isDefaultBusiness: boolean;

  joinedAt: Date;

  invitedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
 * SCHEMA
 * =======================================================*/

const BusinessMemberSchema = new Schema<IBusinessMember>(
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
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    memberType: {
      type: String,
      enum: Object.values(BusinessMemberType),
      required: true,
      default: BusinessMemberType.EMPLOYEE,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(BusinessMemberStatus),
      default: BusinessMemberStatus.ACTIVE,
      index: true,
    },

    isDefaultBusiness: {
      type: Boolean,
      default: false,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    invitedBy: {
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

BusinessMemberSchema.index(
  {
    userId: 1,
    businessId: 1,
  },
  {
    unique: true,
  }
);

BusinessMemberSchema.index({
  organizationId: 1,
  businessId: 1,
});

BusinessMemberSchema.index({
  businessId: 1,
  status: 1,
});

BusinessMemberSchema.index({
  userId: 1,
  status: 1,
});

/* =========================================================
 * MODEL
 * =======================================================*/

const BusinessMember: Model<IBusinessMember> =
  mongoose.models.BusinessMember ||
  mongoose.model<IBusinessMember>(
    "BusinessMember",
    BusinessMemberSchema
  );

export default BusinessMember;
