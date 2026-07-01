import mongoose, { Schema, Document, Model } from 'mongoose';

export type VendorStatus = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' | 'SUSPENDED';

export interface IVendorProfile extends Document {
  userId?:      mongoose.Types.ObjectId;
  businessId:   mongoose.Types.ObjectId;
  vendorId:     string;
  companyName:  string;
  contactPerson?: string;
  email?:       string;
  phone?:       string;
  address?: {
    street?:  string;
    city?:    string;
    state?:   string;
    pincode?: string;
    country:  string;
  };
  gstNumber?:  string;
  panNumber?:  string;
  bankDetails?: {
    accountName?:  string;
    accountNumber?: string;
    ifscCode?:     string;
    bankName?:     string;
  };
  creditLimit: number;
  paymentTerms: string;
  category?: string;
  rating:    number;
  status:    VendorStatus;
  isApproved: boolean;
  isDeleted:  boolean;
  createdAt:  Date;
  updatedAt:  Date;
}

const VendorProfileSchema = new Schema<IVendorProfile>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User',     default: null },
    businessId:   { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    vendorId:     { type: String, unique: true },
    companyName:  { type: String, required: true },
    contactPerson: { type: String },
    email:        { type: String },              /* optional — not all vendors have a portal login */
    phone:        { type: String },
    address: {
      street:  { type: String },
      city:    { type: String },
      state:   { type: String },
      pincode: { type: String },
      country: { type: String, default: 'India' },
    },
    gstNumber:  { type: String },
    panNumber:  { type: String },
    bankDetails: {
      accountName:   { type: String },
      accountNumber: { type: String },
      ifscCode:      { type: String },
      bankName:      { type: String },
    },
    creditLimit:  { type: Number, default: 0 },
    paymentTerms: { type: String, default: '30 days' },
    category:     { type: String },
    rating:       { type: Number, min: 0, max: 5, default: 0 },
    status: {
      type:    String,
      enum:    ['PENDING', 'APPROVED', 'ACTIVE', 'INACTIVE', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING',
      index:   true,
    },
    isApproved: { type: Boolean, default: false },
    isDeleted:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

VendorProfileSchema.index({ businessId: 1, email: 1 });
VendorProfileSchema.index({ businessId: 1, status: 1 });

const VendorProfile: Model<IVendorProfile> =
  mongoose.models.VendorProfile ||
  mongoose.model<IVendorProfile>('VendorProfile', VendorProfileSchema);

export default VendorProfile;
