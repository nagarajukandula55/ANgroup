/**
 * CrmCall — the core record of the CRM call lifecycle: call entry ->
 * disposition -> (optional) conversion into a JobSheet -> closure.
 *
 * This replaces the ad-hoc inline "Lead" schema that used to live in
 * app/api/crm/leads/route.ts and app/api/crm/leads/[id]/route.ts (each
 * declaring its own copy of the same shape — the same class of bug already
 * fixed for SalesInvoice, see that model's top comment). CrmCall is the
 * single source of truth for a call/lead record going forward; the legacy
 * Lead model/routes are left in place for backward compatibility but new
 * work should read/write CrmCall.
 *
 * Lifecycle (status):
 *   NEW -> CONTACTED -> QUALIFIED -> JOB_CREATED -> IN_PROGRESS -> CLOSED_WON
 *                                                                -> CLOSED_LOST
 * Any call can also be dropped at NOT_INTERESTED / NO_RESPONSE without ever
 * becoming a job.
 */

import mongoose, { Schema, Model, Document, Types } from "mongoose";

export type CrmCallStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "JOB_CREATED"
  | "IN_PROGRESS"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "NOT_INTERESTED"
  | "NO_RESPONSE";

export type CrmCallPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type CrmCallDisposition =
  | "INTERESTED"
  | "CALLBACK_REQUESTED"
  | "NOT_INTERESTED"
  | "NO_ANSWER"
  | "WRONG_NUMBER"
  | "CONVERTED"
  | "OTHER";

export interface ICrmCallLogEntry {
  _id?: Types.ObjectId;
  disposition: CrmCallDisposition;
  notes?: string;
  nextFollowUpAt?: Date;
  calledBy: Types.ObjectId;
  calledAt: Date;
}

export interface ICrmCall extends Document {
  businessId: Types.ObjectId;
  callNumber: string; // human-facing reference, e.g. CALL-2526-0001

  // ── Caller / customer details ──────────────────────────────────────
  customerName: string;
  company?: string;
  phone: string;
  email?: string;
  address?: string;

  // ── Enquiry details ─────────────────────────────────────────────────
  source?: string; // e.g. "Website", "Referral", "Walk-in", "Ad"
  subject: string;
  description?: string;
  priority: CrmCallPriority;

  // ── Pipeline ─────────────────────────────────────────────────────────
  status: CrmCallStatus;
  assignedTo?: Types.ObjectId;
  callLogs: ICrmCallLogEntry[];
  nextFollowUpAt?: Date;

  // ── Conversion / closure ────────────────────────────────────────────
  jobSheetId?: Types.ObjectId;
  closedAt?: Date;
  closedReason?: string;
  estimatedValue?: number;
  currency: string;

  tags: string[];
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CrmCallLogSchema = new Schema<ICrmCallLogEntry>(
  {
    disposition: {
      type: String,
      enum: [
        "INTERESTED",
        "CALLBACK_REQUESTED",
        "NOT_INTERESTED",
        "NO_ANSWER",
        "WRONG_NUMBER",
        "CONVERTED",
        "OTHER",
      ],
      required: true,
    },
    notes: { type: String, default: "" },
    nextFollowUpAt: { type: Date },
    calledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    calledAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CrmCallSchema = new Schema<ICrmCall>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    callNumber: { type: String, required: true, index: true },

    customerName: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },

    source: { type: String, default: "" },
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },

    status: {
      type: String,
      enum: [
        "NEW",
        "CONTACTED",
        "QUALIFIED",
        "JOB_CREATED",
        "IN_PROGRESS",
        "CLOSED_WON",
        "CLOSED_LOST",
        "NOT_INTERESTED",
        "NO_RESPONSE",
      ],
      default: "NEW",
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    callLogs: { type: [CrmCallLogSchema], default: [] },
    nextFollowUpAt: { type: Date, index: true },

    jobSheetId: { type: Schema.Types.ObjectId, ref: "CrmJobSheet" },
    closedAt: { type: Date },
    closedReason: { type: String },
    estimatedValue: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },

    tags: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Multi-tenant hot path: call lists are always filtered by businessId and
// sorted newest-first / by status — same reasoning as SalesInvoice's indexes.
CrmCallSchema.index({ businessId: 1, createdAt: -1 });
CrmCallSchema.index({ businessId: 1, status: 1 });
CrmCallSchema.index({ businessId: 1, assignedTo: 1, status: 1 });
CrmCallSchema.index({ businessId: 1, callNumber: 1 }, { unique: true });

const CrmCall: Model<ICrmCall> =
  (mongoose.models.CrmCall as Model<ICrmCall>) ||
  mongoose.model<ICrmCall>("CrmCall", CrmCallSchema);

export default CrmCall;
