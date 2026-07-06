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

export type EmailProviderKind = 'SMTP' | 'SENDGRID' | 'MAILGUN' | 'SES' | 'RESEND';

export interface EmailConfig {
  /** Which of the below sub-configs is active for this business. Named to
   * match the admin/integrations page's EmailConfig.provider field (the
   * whole object is saved as-is into this Mixed config), not a separate
   * name — avoids a UI/model naming mismatch. Defaults to 'SMTP' for older
   * saved configs that predate this field. */
  provider?: EmailProviderKind;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  recipients: string[];
  notificationTriggers: string[];
  /** Resend-specific — used when emailProvider === 'RESEND'. Falls back to
   * process.env.RESEND_API_KEY / RESEND_FROM (the previous global-only
   * behavior) when a business hasn't configured its own key yet. */
  resendApiKey?: string;
  resendFromEmail?: string;
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
