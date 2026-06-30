import mongoose, { Document, Model, Schema, Types } from "mongoose";

export enum AgreementStatus {
  DRAFT = "DRAFT",
  PENDING_VENDOR = "PENDING_VENDOR",
  PENDING_COMPANY = "PENDING_COMPANY",
  SIGNED = "SIGNED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export enum AgreementType {
  VENDOR_SUPPLY = "VENDOR_SUPPLY",
  NDA = "NDA",
  SERVICE_LEVEL = "SERVICE_LEVEL",
  PARTNERSHIP = "PARTNERSHIP",
  EMPLOYMENT = "EMPLOYMENT",
  DISTRIBUTION = "DISTRIBUTION",
}

export interface IAgreement extends Document {
  agreementNumber: string;
  title: string;
  type: AgreementType;
  status: AgreementStatus;

  businessId: Types.ObjectId;
  createdBy: Types.ObjectId;

  // Parties
  companyName: string;
  companySignatory: string;
  companySignature?: string;
  companySignedAt?: Date;

  vendorName: string;
  vendorEmail: string;
  vendorSignatory: string;
  vendorSignature?: string;
  vendorSignedAt?: Date;

  // Content
  content: string;       // Rich text / HTML
  pdfUrl?: string;

  // Terms
  startDate?: Date;
  endDate?: Date;
  value?: number;
  currency: string;

  notes?: string;

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgreementSchema = new Schema<IAgreement>(
  {
    agreementNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: Object.values(AgreementType), required: true },
    status: { type: String, enum: Object.values(AgreementStatus), default: AgreementStatus.DRAFT },

    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    companyName: { type: String, required: true },
    companySignatory: { type: String, required: true },
    companySignature: { type: String, default: null },
    companySignedAt: { type: Date, default: null },

    vendorName: { type: String, required: true },
    vendorEmail: { type: String, required: true },
    vendorSignatory: { type: String, required: true },
    vendorSignature: { type: String, default: null },
    vendorSignedAt: { type: Date, default: null },

    content: { type: String, required: true },
    pdfUrl: { type: String, default: null },

    startDate: { type: Date },
    endDate: { type: Date },
    value: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    notes: { type: String },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

AgreementSchema.index({ businessId: 1, status: 1 });
AgreementSchema.index({ vendorEmail: 1 });
AgreementSchema.index({ agreementNumber: 1 });

const Agreement: Model<IAgreement> =
  mongoose.models.Agreement ||
  mongoose.model<IAgreement>("Agreement", AgreementSchema);

export default Agreement;
