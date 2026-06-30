import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IParty {
  name: string;
  email: string;
  role: 'COMPANY' | 'VENDOR' | 'EMPLOYEE' | 'PARTY_A' | 'PARTY_B';
  phone?: string;
  address?: string;
  aadhaarLast4?: string;
  panNumber?: string;
}

export interface ISignature {
  partyEmail: string;
  partyName: string;
  partyRole: string;
  signedAt?: Date;
  signatureData?: string;
  ipAddress?: string;
  otpVerified: boolean;
  otp?: string;
  otpExpiry?: Date;
}

export interface IAgreement extends Document {
  businessId: mongoose.Types.ObjectId;
  templateType: 'NDA' | 'VENDOR_SUPPLY' | 'EMPLOYMENT' | 'SERVICE_AGREEMENT' | 'MOU' | 'CUSTOM';
  title: string;
  parties: IParty[];
  content: string;
  variables: Record<string, unknown>;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'PARTIALLY_SIGNED' | 'FULLY_SIGNED' | 'EXPIRED' | 'CANCELLED';
  signatures: ISignature[];
  expiresAt?: Date;
  signedPdfUrl?: string;
  governingLaw: string;
  jurisdiction: string;
  stampDutyNotice: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PartySchema = new Schema<IParty>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: {
    type: String,
    enum: ['COMPANY', 'VENDOR', 'EMPLOYEE', 'PARTY_A', 'PARTY_B'],
    required: true,
  },
  phone: { type: String },
  address: { type: String },
  aadhaarLast4: { type: String },
  panNumber: { type: String },
}, { _id: false });

const SignatureSchema = new Schema<ISignature>({
  partyEmail: { type: String, required: true },
  partyName: { type: String, required: true },
  partyRole: { type: String, required: true },
  signedAt: { type: Date },
  signatureData: { type: String },
  ipAddress: { type: String },
  otpVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
}, { _id: false });

const AgreementSchema = new Schema<IAgreement>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    templateType: {
      type: String,
      enum: ['NDA', 'VENDOR_SUPPLY', 'EMPLOYMENT', 'SERVICE_AGREEMENT', 'MOU', 'CUSTOM'],
      required: true,
    },
    title: { type: String, required: true },
    parties: [PartySchema],
    content: { type: String },
    variables: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_SIGNATURE', 'PARTIALLY_SIGNED', 'FULLY_SIGNED', 'EXPIRED', 'CANCELLED'],
      default: 'DRAFT',
    },
    signatures: [SignatureSchema],
    expiresAt: { type: Date },
    signedPdfUrl: { type: String },
    governingLaw: {
      type: String,
      default: 'Indian Contract Act, 1872',
    },
    jurisdiction: {
      type: String,
      default: 'India',
    },
    stampDutyNotice: {
      type: String,
      default: 'This agreement may be subject to stamp duty as per the Indian Stamp Act, 1899.',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

AgreementSchema.index({ businessId: 1, status: 1 });
AgreementSchema.index({ 'parties.email': 1 });
AgreementSchema.index({ status: 1 });

const Agreement: Model<IAgreement> =
  mongoose.models.Agreement || mongoose.model<IAgreement>('Agreement', AgreementSchema);

export default Agreement;
