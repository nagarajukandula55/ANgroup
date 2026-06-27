import mongoose, { Document, Model, Schema, Types } from "mongoose";

/* =========================================================
 * ORGANIZATION DOCUMENT
 * =======================================================*/

export interface IOrganization extends Document {
  name: string;
  code: string;

  legalName?: string;

  email?: string;
  phone?: string;
  website?: string;

  logo?: string;

  gstNumber?: string;
  panNumber?: string;

  addressLine1?: string;
  addressLine2?: string;

  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;

  ownerId?: Types.ObjectId;

  isActive: boolean;
  isDeleted: boolean;

  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
 * SCHEMA
 * =======================================================*/

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
      index: true,
    },

    legalName: {
      type: String,
      default: null,
      trim: true,
    },

    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
    },

    website: {
      type: String,
      default: null,
      trim: true,
    },

    logo: {
      type: String,
      default: null,
    },

    gstNumber: {
      type: String,
      default: null,
      trim: true,
    },

    panNumber: {
      type: String,
      default: null,
      trim: true,
    },

    addressLine1: {
      type: String,
      default: null,
    },

    addressLine2: {
      type: String,
      default: null,
    },

    city: {
      type: String,
      default: null,
    },

    state: {
      type: String,
      default: null,
    },

    country: {
      type: String,
      default: "India",
    },

    postalCode: {
      type: String,
      default: null,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
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

OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ code: 1 });
OrganizationSchema.index({ isActive: 1 });

/* =========================================================
 * MODEL
 * =======================================================*/

const Organization: Model<IOrganization> =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);

export default Organization;
