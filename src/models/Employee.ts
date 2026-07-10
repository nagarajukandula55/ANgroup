import mongoose, { Schema, Document, Types } from "mongoose";

export interface IEmployee extends Document {
  userId?: Types.ObjectId;
  businessId: Types.ObjectId;
  employeeId?: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE" | "TERMINATED";
  joiningDate?: Date;
  terminationDate?: Date;
  salary: number;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  panNumber?: string;
  aadharNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  reportingTo?: Types.ObjectId;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    department: {
      type: String,
      enum: [
        "HR",
        "Finance",
        "Sales",
        "Operations",
        "IT",
        "Marketing",
        "Admin",
        "Warehouse",
        "Logistics",
        "Other",
      ],
    },
    designation: {
      type: String,
    },
    employmentType: {
      type: String,
      enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"],
      default: "FULL_TIME",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ON_LEAVE", "INACTIVE", "TERMINATED"],
      default: "ACTIVE",
    },
    joiningDate: {
      type: Date,
    },
    terminationDate: {
      type: Date,
    },
    salary: {
      type: Number,
      default: 0,
    },
    bankDetails: {
      accountName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    panNumber: {
      type: String,
    },
    aadharNumber: {
      type: String,
      // Store only last 4 digits for security
    },
    pfNumber: {
      type: String,
    },
    esiNumber: {
      type: String,
    },
    reportingTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
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

// Compound index on businessId + isDeleted for efficient queries
EmployeeSchema.index({ businessId: 1, isDeleted: 1 });

// employeeId already gets this exact { unique: true, sparse: true } index
// from its own field definition above -- this was an exact duplicate.

const Employee =
  mongoose.models.Employee ||
  mongoose.model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
