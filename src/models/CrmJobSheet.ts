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

// Milestone stepper, per explicit spec:
//   CREATED         -- workorder just created (from an appointment or direct)
//   REPAIR_STARTED  -- CCO assigned it to an engineer
//   REPAIR_IN_PROGRESS -- engineer is actively working the job
//   REPAIR_COMPLETED   -- parts/solution selected, workorder+invoice
//                          downloadable, awaiting handover
//   CLOSED          -- SC recorded payment collected + handed over to customer
//   CANCELLED       -- vendor requested cancel, routed to manager
// Old DRAFT/SCHEDULED/IN_PROGRESS/PART_PENDING/COMPLETED/INVOICED enum
// replaced outright (this is the milestone system now, not the old
// technician-scheduling one) -- see the numbered transition routes under
// api/crm/jobsheets/[id]/ (assign-engineer, start-repair, complete-repair,
// handover, cancel).
export type CrmJobSheetStatus =
  | "CREATED"
  | "REPAIR_STARTED"
  | "REPAIR_IN_PROGRESS"
  | "REPAIR_COMPLETED"
  | "CLOSED"
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
  // Service center this job sheet was issued from -- optional; when set,
  // its Warehouse.logoUrl overrides the business logo on the printed
  // workorder/estimate. See core/documentTemplates/resolve.ts.
  warehouseId?: Types.ObjectId;

  callId?: Types.ObjectId; // originating CrmCall -- absent for a standalone/walk-in job sheet
  customerName: string;
  company?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;

  // Workorder-creation fields (per CRM Appointment -> Workorder spec):
  product?: string; // device/category, e.g. "AC", "Washing Machine"
  brandId?: Types.ObjectId; // ref Brand
  deviceModel?: string;
  imeiOrSerialNumber?: string;
  issueDescription?: string; // free-text VOC, independent of faultCodeId
  faultCodeId?: Types.ObjectId; // ref FaultCode
  remark?: string;
  // Carried over from the originating call/appointment (see CrmCall) so
  // the workorder doesn't have to ask again.
  appointmentType?: "ONSITE" | "WALKIN";
  requestType?: "REPAIR" | "INSTALLATION";

  // Set when status moves to PART_PENDING — optional brand job number for
  // the part order, per spec ("ask if have Brand Job No for Part Order").
  brandJobNoForPartOrder?: string;

  title: string;
  description?: string;
  scheduledAt?: Date;
  completedAt?: Date;

  assignedTo?: Types.ObjectId; // engineer performing the job
  assignedBy?: Types.ObjectId; // CCO who made the assignment
  engineerAssignedAt?: Date;
  status: CrmJobSheetStatus;

  lineItems: ICrmJobSheetLineItem[];
  materialsUsed?: string;
  workPerformed?: string;
  // Structured solution reference alongside the free-text workPerformed
  // above -- optional, doesn't replace it.
  solutionId?: Types.ObjectId;
  customerSignatureUrl?: string;
  internalNotes?: string;

  // Cancellation -- vendor staff requests it, routed to the vendor's own
  // Manager (the main login), per spec ("access to Cancel to manager").
  cancelReason?: string;
  cancelRequestedBy?: Types.ObjectId;
  cancelledAt?: Date;

  // Handover (final milestone) -- SC records what was actually collected.
  paymentCollected?: number;
  paymentMode?: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER";
  handedOverAt?: Date;
  handedOverBy?: Types.ObjectId;

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
    warehouseId: { type: Schema.Types.ObjectId, ref: "Warehouse", default: null },

    // Was `required: true` -- directly contradicted this route's own
    // documented purpose ("create a STANDALONE job sheet, not tied to a
    // call -- e.g. a direct walk-in service request", see
    // api/crm/jobsheets/route.ts's top comment). Every walk-in/direct
    // job sheet creation failed schema validation outright; only
    // call-conversion (which does set callId) ever worked.
    callId: { type: Schema.Types.ObjectId, ref: "CrmCall", index: true },
    customerName: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },

    product: { type: String, trim: true },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand" },
    deviceModel: { type: String, trim: true },
    imeiOrSerialNumber: { type: String, trim: true },
    issueDescription: { type: String, default: "" },
    faultCodeId: { type: Schema.Types.ObjectId, ref: "FaultCode" },
    remark: { type: String, default: "" },
    appointmentType: { type: String, enum: ["ONSITE", "WALKIN"] },
    requestType: { type: String, enum: ["REPAIR", "INSTALLATION"] },

    brandJobNoForPartOrder: { type: String, trim: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scheduledAt: { type: Date },
    completedAt: { type: Date },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    engineerAssignedAt: { type: Date },
    status: {
      type: String,
      enum: ["CREATED", "REPAIR_STARTED", "REPAIR_IN_PROGRESS", "REPAIR_COMPLETED", "CLOSED", "CANCELLED"],
      default: "CREATED",
      index: true,
    },

    lineItems: { type: [CrmJobSheetLineItemSchema], default: [] },
    materialsUsed: { type: String, default: "" },
    workPerformed: { type: String, default: "" },
    solutionId: { type: Schema.Types.ObjectId, ref: "Solution", default: null },
    customerSignatureUrl: { type: String, default: "" },
    internalNotes: { type: String, default: "" },

    cancelReason: { type: String },
    cancelRequestedBy: { type: Schema.Types.ObjectId, ref: "User" },
    cancelledAt: { type: Date },

    paymentCollected: { type: Number },
    paymentMode: { type: String, enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"] },
    handedOverAt: { type: Date },
    handedOverBy: { type: Schema.Types.ObjectId, ref: "User" },

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
