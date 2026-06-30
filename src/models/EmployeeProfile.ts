import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployeeProfile extends Document {
  userId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  employeeId: string;
  department?: string;
  designation?: string;
  joiningDate?: Date;
  reportingTo?: mongoose.Types.ObjectId;
  salary?: number;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  documents?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeProfileSchema = new Schema<IEmployeeProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    employeeId: { type: String, unique: true },
    department: { type: String },
    designation: { type: String },
    joiningDate: { type: Date },
    reportingTo: { type: Schema.Types.ObjectId, ref: 'User' },
    salary: { type: Number },
    employmentType: {
      type: String,
      enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
      default: 'FULL_TIME',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ON_LEAVE', 'TERMINATED'],
      default: 'ACTIVE',
    },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relationship: { type: String },
    },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

EmployeeProfileSchema.index({ businessId: 1, userId: 1 }, { unique: true });

const EmployeeProfile: Model<IEmployeeProfile> =
  mongoose.models.EmployeeProfile ||
  mongoose.model<IEmployeeProfile>('EmployeeProfile', EmployeeProfileSchema);

export default EmployeeProfile;
