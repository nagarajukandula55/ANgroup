import mongoose, { Schema, Document, Model } from 'mongoose';

export type SocialPlatform = 'INSTAGRAM' | 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'ALL';
export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'POSTED' | 'FAILED' | 'DELETED';

export interface ISocialPost extends Document {
  businessId: mongoose.Types.ObjectId;
  platform: SocialPlatform;
  caption: string;
  imageUrl?: string;
  hashtags: string[];
  status: PostStatus;
  scheduledAt?: Date;
  postedAt?: Date;
  externalPostId?: string;
  errorMessage?: string;
  channelIds: mongoose.Types.ObjectId[];
  channelResults?: { channelId: mongoose.Types.ObjectId; success: boolean; externalId?: string; error?: string }[];
  avatarId?: mongoose.Types.ObjectId;
  topic?: string;
  aiGenerated: boolean;
  automationRuleId?: mongoose.Types.ObjectId;
  engagementScore: number;
  lastResharedAt?: Date;
  resharedFromPostId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SocialPostSchema = new Schema<ISocialPost>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['INSTAGRAM', 'LINKEDIN', 'TWITTER', 'FACEBOOK', 'ALL'],
      required: true,
    },
    caption: {
      type: String,
      required: true,
      maxlength: 2200,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    hashtags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'POSTED', 'FAILED', 'DELETED'],
      default: 'DRAFT',
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    postedAt: {
      type: Date,
      default: null,
    },
    externalPostId: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    channelIds: [{ type: Schema.Types.ObjectId, ref: 'SocialChannel' }],
    channelResults: [
      {
        channelId: { type: Schema.Types.ObjectId, ref: 'SocialChannel' },
        success: { type: Boolean },
        externalId: { type: String },
        error: { type: String },
      },
    ],
    avatarId: { type: Schema.Types.ObjectId, ref: 'AvatarProfile', default: null },
    topic: { type: String, default: null },
    aiGenerated: { type: Boolean, default: false },
    automationRuleId: { type: Schema.Types.ObjectId, ref: 'AutomationRule', default: null },
    engagementScore: { type: Number, default: 0 },
    lastResharedAt: { type: Date, default: null },
    resharedFromPostId: { type: Schema.Types.ObjectId, ref: 'SocialPost', default: null },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

SocialPostSchema.index({ businessId: 1, status: 1 });
SocialPostSchema.index({ businessId: 1, platform: 1 });
SocialPostSchema.index({ businessId: 1, scheduledAt: 1 });

const SocialPost: Model<ISocialPost> =
  mongoose.models.SocialPost ||
  mongoose.model<ISocialPost>('SocialPost', SocialPostSchema);

export default SocialPost;
