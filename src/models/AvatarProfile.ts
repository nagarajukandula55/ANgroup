import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * A brand/persona avatar image generated (or uploaded) for a business,
 * used as the consistent visual identity attached to AI-generated posts.
 * One business can have several (e.g. per-brand or per-campaign); one is
 * flagged isDefault for auto-pilot to fall back on when a rule doesn't
 * name a specific avatar.
 */
export interface IAvatarProfile extends Document {
  businessId: mongoose.Types.ObjectId;
  name: string;
  imageUrl: string;
  prompt?: string;
  style?: string;
  source: 'AI_GENERATED' | 'UPLOADED';
  isDefault: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AvatarProfileSchema = new Schema<IAvatarProfile>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    imageUrl: { type: String, required: true },
    prompt: { type: String, default: null },
    style: { type: String, default: null },
    source: { type: String, enum: ['AI_GENERATED', 'UPLOADED'], default: 'AI_GENERATED' },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AvatarProfileSchema.index({ businessId: 1, isDefault: 1 });

const AvatarProfile: Model<IAvatarProfile> =
  mongoose.models.AvatarProfile || mongoose.model<IAvatarProfile>('AvatarProfile', AvatarProfileSchema);

export default AvatarProfile;
