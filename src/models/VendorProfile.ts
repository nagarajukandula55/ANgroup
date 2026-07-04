import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Vendor onboarding lifecycle:
 *  APPLIED          — vendor submitted the public application form
 *  PENDING          — created directly by admin (legacy default)
 *  AGREEMENT_SENT   — admin reviewed & approved application; partner
 *                     agreement triggered for signing
 *  AGREEMENT_SIGNED — vendor signed the agreement (verified via Agreement)
 *  APPROVED         — admin gave final approval; vendor ID + login issued
 *  ACTIVE           — vendor is live (can manage warehouse/products/orders)
 *  INACTIVE / REJECTED / SUSPENDED — terminal / paused states
 */
export type VendorStatus =
  | 'APPLIED'
  | 'PENDING'
  | 'AGREEMENT_SENT'
  | 'AGREEMENT_SIGNED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'REJECTED'
  | 'SUSPENDED';

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
  /** true = GST-registered vendor (gstNumber required), false = without GST */
  gstRegistered?: boolean;
  gstNumber?:  string;
  panNumber?:  string;
  /** partner agreement generated at review-approval time */
  agreementId?: mongoose.Types.ObjectId;
  reviewedBy?:  mongoose.Types.ObjectId;
  reviewedAt?:  Date;
  finalApprovedBy?: mongoose.Types.ObjectId;
  finalApprovedAt?: Date;
  rejectionReason?: string;
  bankDetails?: {
    accountName?:  string;
    accountNumber?: string;
    ifscCode?:     string;
    bankName?:     string;
  };
  creditLimit: number;
  paymentTerms: string;
  category?: string;
  businessType?: string;
  notes?:    string;
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
    gstRegistered: { type: Boolean, default: false },
    gstNumber:  { type: String },
    agreementId:      { type: Schema.Types.ObjectId, ref: 'Agreement', default: null },
    reviewedBy:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt:       { type: Date, default: null },
    finalApprovedBy:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    finalApprovedAt:  { type: Date, default: null },
    rejectionReason:  { type: String, default: null },
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
    businessType: { type: String },
    notes:        { type: String },
    rating:       { type: Number, min: 0, max: 5, default: 0 },
    status: {
      type:    String,
      enum:    ['APPLIED', 'PENDING', 'AGREEMENT_SENT', 'AGREEMENT_SIGNED',
                'APPROVED', 'ACTIVE', 'INACTIVE', 'REJECTED', 'SUSPENDED'],
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
// Hot path for the vendor list page (filter by business, newest first)
VendorProfileSchema.index({ businessId: 1, isDeleted: 1, createdAt: -1 });

const VendorProfile: Model<IVendorProfile> =
  mongoose.models.VendorProfile ||
  mongoose.model<IVendorProfile>('VendorProfile', VendorProfileSchema);

export default VendorProfile;
