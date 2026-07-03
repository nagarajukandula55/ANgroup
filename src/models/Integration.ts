import mongoose, { Schema, Document, Model } from 'mongoose';

export type IntegrationProvider = 'TELEGRAM' | 'WHATSAPP' | 'SLACK' | 'EMAIL';

export interface TelegramConfig {
  botToken: string;
  chatIds: string[];
  notificationTriggers: string[];
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  recipients: string[];
  notificationTriggers: string[];
}

export interface SlackConfig {
  webhookUrl: string;
  channel: string;
  notificationTriggers: string[];
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  recipients: string[];
  notificationTriggers: string[];
}

export type IntegrationConfig =
  | TelegramConfig
  | WhatsAppConfig
  | SlackConfig
  | EmailConfig;

export interface IIntegration extends Document {
  businessId: mongoose.Types.ObjectId;
  provider: IntegrationProvider;
  isActive: boolean;
  config: IntegrationConfig;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    provider: {
      type: String,
      enum: ['TELEGRAM', 'WHATSAPP', 'SLACK', 'EMAIL'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    config: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

IntegrationSchema.index({ businessId: 1, provider: 1 }, { unique: true });

const Integration: Model<IIntegration> =
  mongoose.models.Integration ||
  mongoose.model<IIntegration>('Integration', IntegrationSchema);

export default Integration;
