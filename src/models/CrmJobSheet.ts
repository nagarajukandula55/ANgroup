/**
 * CrmJobSheet — created when a CrmCall is converted into actual work
 * (a technician visit, a service job, a fulfillment task, etc.). This is
 * the "call entry -> job sheet -> invoice -> closure" middle step the CRM
 * lifecycle needs: it records what work was scoped/performed, by whom, and
 * links forward to the SalesInvoice generated at closure.
 *
 * Deliberately generic ("lineItems" with free-text description + qty/rate,
 * not tied to the Product catalog) so it works for a pure-service business
 * (AC repair, consulting visit) as well as a goods+service business,
 * without forcing every job through the full Product/Inventory pipeline.
 * A job sheet's lineItems are copied into the SalesInvoice's items at
 * closure — see /api/crm/jobsheets/[id]/close/route.ts.
 */

import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type CrmJobSheetStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "PART_PENDING"
  | "COMPLETED"
  | "INVOICED"
  | "CANCELLED";

export interface ICrmJobSheetLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  hsnCode?: string; // set when the line was picked from ServiceCenterBOM
  serviceCenterBOMId?: Types.ObjectId; // ref ServiceCenterBOM, if picked from BOM
}

export interface ICrmJobSheet extends Document {
  businessId: Types.ObjectId;
  jobSheetNumber: string;

  callId: Types.ObjectId; // originating CrmCall
  customerName: string;
  company?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Workorder-creation fields (per CRM Appointment -> Workorder spec):
  brandId?: Types.ObjectId; // ref Brand
  imeiOrSerialNumber?: string;
  issueDescription?: string; // free-text VOC, independent of faultCodeId
  faultCodeId?: Types.ObjectId; // ref FaultCode
  remark?: string;

  // Set when status moves to PART_PENDING — optional brand job number for
  // the part order, per spec ("ask if have Brand Job No for Part Order").
  brandJobNoForPartOrder?: string;

  title: string;
  description?: string;
  scheduledAt?: Date;
  completedAt?: Date;

  assignedTo?: Types.ObjectId; // technician / staff performing the job
  status: CrmJobSheetStatus;

  lineItems: ICrmJobSheetLineItem[];
  materialsUsed?: string;
  workPerformed?: string;
  customerSignatureUrl?: string;
  internalNotes?: string;

  invoiceId?: Types.ObjectId; // SalesInvoice created at closure
  invoiceNumber?: string;

  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CrmJobSheetLineItemSchema = new Schema<ICrmJobSheetLineItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: "pcs" },
    unitPrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    hsnCode: { type: String },
    serviceCenterBOMId: { type: Schema.Types.ObjectId, ref: "ServiceCenterBOM" },
  },
  { _id: false }
);

const CrmJobSheetSchema = new Schema<ICrmJobSheet>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    jobSheetNumber: { type: String, required: true, index: true },

    callId: { type: Schema.Types.ObjectId, ref: "CrmCall", required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },

    brandId: { type: Schema.Types.ObjectId, ref: "Brand" },
    imeiOrSerialNumber: { type: String, trim: true },
    issueDescription: { type: String, default: "" },
    faultCodeId: { type: Schema.Types.ObjectId, ref: "FaultCode" },
    remark: { type: String, default: "" },

    brandJobNoForPartOrder: { type: String, trim: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scheduledAt: { type: Date },
    completedAt: { type: Date },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["DRAFT", "SCHEDULED", "IN_PROGRESS", "PART_PENDING", "COMPLETED", "INVOICED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },

    lineItems: { type: [CrmJobSheetLineItemSchema], default: [] },
    materialsUsed: { type: String, default: "" },
    workPerformed: { type: String, default: "" },
    customerSignatureUrl: { type: String, default: "" },
    internalNotes: { type: String, default: "" },

    invoiceId: { type: Schema.Types.ObjectId, ref: "SalesInvoice" },
    invoiceNumber: { type: String },

    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CrmJobSheetSchema.index({ businessId: 1, createdAt: -1 });
CrmJobSheetSchema.index({ businessId: 1, status: 1 });
CrmJobSheetSchema.index({ businessId: 1, jobSheetNumber: 1 }, { unique: true });

const CrmJobSheet: Model<ICrmJobSheet> =
  (mongoose.models.CrmJobSheet as Model<ICrmJobSheet>) ||
  mongoose.model<ICrmJobSheet>("CrmJobSheet", CrmJobSheetSchema);

export default CrmJobSheet;
