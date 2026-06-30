import mongoose, { Schema, Document, Model } from 'mongoose';

export type IntegrationType =
  | 'TELEGRAM'
  | 'WHATSAPP'
  | 'INSTAGRAM'
  | 'LINKEDIN'
  | 'TWITTER'
  | 'FACEBOOK';

export interface IIntegration extends Document {
  businessId: string;
  type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    businessId: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['TELEGRAM', 'WHATSAPP', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'FACEBOOK'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

IntegrationSchema.index({ businessId: 1, type: 1 }, { unique: true });

const Integration: Model<IIntegration> =
  mongoose.models.Integration ||
  mongoose.model<IIntegration>('Integration', IntegrationSchema);

export default Integration;
