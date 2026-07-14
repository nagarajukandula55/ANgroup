import mongoose, { Schema, Document, Model } from 'mongoose';

export type ChannelPlatform = 'INSTAGRAM' | 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'YOUTUBE';

/**
 * A single connected page/account (e.g. one specific Facebook Page, one
 * Instagram business account). Unlike Integration (one config per
 * businessId+provider), a business can have many SocialChannel docs per
 * platform -- this is what makes "multiple pages per platform" possible.
 * Credentials are stored the same free-form way Integration already does
 * for couriers, so real OAuth tokens can be dropped in per-provider without
 * another schema migration.
 */
export interface ISocialChannel extends Document {
  businessId: mongoose.Types.ObjectId;
  platform: ChannelPlatform;
  name: string;
  avatarUrl?: string;
  externalPageId?: string;
  credentials: {
    accessToken?: string;
    bearerToken?: string;
    pageId?: string;
    authorUrn?: string;
    userId?: string;
    channelId?: string;
  };
  isActive: boolean;
  isConnected: boolean;
  autopilotEnabled: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SocialChannelSchema = new Schema<ISocialChannel>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    platform: {
      type: String,
      enum: ['INSTAGRAM', 'LINKEDIN', 'TWITTER', 'FACEBOOK', 'YOUTUBE'],
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    avatarUrl: { type: String, default: null },
    externalPageId: { type: String, default: null },
    credentials: {
      accessToken: { type: String, default: null },
      bearerToken: { type: String, default: null },
      pageId: { type: String, default: null },
      authorUrn: { type: String, default: null },
      userId: { type: String, default: null },
      channelId: { type: String, default: null },
    },
    isActive: { type: Boolean, default: true },
    isConnected: { type: Boolean, default: false },
    autopilotEnabled: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

SocialChannelSchema.index({ businessId: 1, platform: 1 });

const SocialChannel: Model<ISocialChannel> =
  mongoose.models.SocialChannel || mongoose.model<ISocialChannel>('SocialChannel', SocialChannelSchema);

export default SocialChannel;
