import mongoose, { Document, Schema } from 'mongoose';

export interface ISignature {
  partyName: string;
  partyEmail: string;
  role?: string;

  otp?: string;
  otpExpiry?: Date;
  otpVerified?: boolean;

  signedAt?: Date;
  signatureData?: string;
  ipAddress?: string;
}

export interface IAgreement extends Document {
  businessId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;

  title: string;

  type:
    | 'NDA'
    | 'EMPLOYMENT'
    | 'VENDOR'
    | 'SERVICE'
    | 'PARTNERSHIP'
    | 'LEASE'
    | 'CONSULTANCY'
    | 'FRANCHISE'
    | 'MOU'
    | 'CUSTOM';

  content: string;

  signatures: ISignature[];

  status:
    | 'DRAFT'
    | 'PENDING_SIGNATURE'
    | 'PARTIALLY_SIGNED'
    | 'SIGNED'
    | 'DECLINED'
    | 'EXPIRED';

  governingLaw: string;
  jurisdiction?: string;

  expiresAt?: Date;
  pdfUrl?: string;
  notes?: string;
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const SignatureSchema = new Schema<ISignature>(
  {
    partyName: {
      type: String,
      required: true,
      trim: true,
    },

    partyEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      trim: true,
    },

    otp: {
      type: String,
    },

    otpExpiry: {
      type: Date,
    },

    otpVerified: {
      type: Boolean,
      default: false,
    },

    signedAt: {
      type: Date,
    },

    signatureData: {
      type: String,
    },

    ipAddress: {
      type: String,
    },
  },
  {
    _id: false,
  }
);

const AgreementSchema = new Schema<IAgreement>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Business',
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        'NDA',
        'EMPLOYMENT',
        'VENDOR',
        'SERVICE',
        'PARTNERSHIP',
        'LEASE',
        'CONSULTANCY',
        'FRANCHISE',
        'MOU',
        'CUSTOM',
      ],
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    signatures: {
      type: [SignatureSchema],
      default: [],
    },

    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_SIGNATURE',
        'PARTIALLY_SIGNED',
        'SIGNED',
        'DECLINED',
        'EXPIRED',
      ],
      default: 'DRAFT',
    },

    governingLaw: {
      type: String,
      default: 'Laws of India',
    },

    jurisdiction: {
      type: String,
    },

    expiresAt: {
      type: Date,
    },

    pdfUrl: {
      type: String,
    },

    notes: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default (mongoose.models.Agreement as mongoose.Model<IAgreement>) ||
  mongoose.model<IAgreement>('Agreement', AgreementSchema);
