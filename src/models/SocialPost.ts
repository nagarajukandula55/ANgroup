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
