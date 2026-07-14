import mongoose, { Schema, Document, Model } from 'mongoose';

export type AutomationFrequency = 'HOURLY' | 'DAILY' | 'EVERY_3_DAYS' | 'WEEKLY';

/**
 * "Auto-pilot" rule: generate content on a cadence and publish it across a
 * set of channels without a human composing each post. The automation
 * cron (/api/cron/social-autopilot) scans for rules whose nextRunAt is due,
 * runs core/social/automationEngine.runRule() for each, then advances
 * nextRunAt by `frequency`.
 */
export interface IAutomationRule extends Document {
  businessId: mongoose.Types.ObjectId;
  name: string;
  isActive: boolean;
  channelIds: mongoose.Types.ObjectId[];
  topics: string[];
  tone: string;
  avatarId?: mongoose.Types.ObjectId;
  frequency: AutomationFrequency;
  postsPerRun: number;
  autoPublish: boolean; // false = generate as DRAFT for review, true = publish immediately
  resharePastPosts: boolean;
  reshareCooldownDays: number;
  lastRunAt?: Date;
  nextRunAt: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationRuleSchema = new Schema<IAutomationRule>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    isActive: { type: Boolean, default: true },
    channelIds: [{ type: Schema.Types.ObjectId, ref: 'SocialChannel' }],
    topics: { type: [String], default: [] },
    tone: { type: String, default: 'professional' },
    avatarId: { type: Schema.Types.ObjectId, ref: 'AvatarProfile', default: null },
    frequency: {
      type: String,
      enum: ['HOURLY', 'DAILY', 'EVERY_3_DAYS', 'WEEKLY'],
      default: 'DAILY',
    },
    postsPerRun: { type: Number, default: 1, min: 1, max: 5 },
    autoPublish: { type: Boolean, default: true },
    resharePastPosts: { type: Boolean, default: false },
    reshareCooldownDays: { type: Number, default: 30, min: 7 },
    lastRunAt: { type: Date, default: null },
    nextRunAt: { type: Date, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

AutomationRuleSchema.index({ businessId: 1, isActive: 1 });
AutomationRuleSchema.index({ isActive: 1, nextRunAt: 1 });

const AutomationRule: Model<IAutomationRule> =
  mongoose.models.AutomationRule || mongoose.model<IAutomationRule>('AutomationRule', AutomationRuleSchema);

export default AutomationRule;
