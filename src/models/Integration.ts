import mongoose, { Schema, Document, Model } from 'mongoose';

export type CourierProviderKey =
  | 'SHIPROCKET'
  | 'DELHIVERY'
  | 'BLUEDART'
  | 'XPRESSBEES'
  | 'ECOM_EXPRESS';

export type IntegrationProvider =
  | 'TELEGRAM'
  | 'WHATSAPP'
  | 'SLACK'
  | 'EMAIL'
  | CourierProviderKey;

export const COURIER_PROVIDER_KEYS: CourierProviderKey[] = [
  'SHIPROCKET',
  'DELHIVERY',
  'BLUEDART',
  'XPRESSBEES',
  'ECOM_EXPRESS',
];

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

/**
 * Generic per-provider courier credential bag. Every courier aggregator/carrier
 * has a different auth shape (Shiprocket: email+password login exchanged for a
 * token; Delhivery/Bluedart/etc: typically a static API key or client
 * id/secret). Rather than hardcoding a Shiprocket-shaped schema, credentials
 * are stored as a free-form string map so any provider's fields can be added
 * without another schema migration. See src/services/shipping for the
 * interpretation of these keys per provider.
 */
export interface CourierConfig {
  credentials: Record<string, string>;
  /** Optional pickup location/warehouse identifier the provider needs at
   * shipment-creation time (e.g. Shiprocket's "pickup_location" nickname). */
  pickupLocation?: string;
}

export type IntegrationConfig =
  | TelegramConfig
  | WhatsAppConfig
  | SlackConfig
  | EmailConfig
  | CourierConfig;

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
      enum: ['TELEGRAM', 'WHATSAPP', 'SLACK', 'EMAIL', ...COURIER_PROVIDER_KEYS],
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
