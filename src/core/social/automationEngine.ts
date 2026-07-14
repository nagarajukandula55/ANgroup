import mongoose from 'mongoose';
import SocialChannel from '@/models/SocialChannel';
import SocialPost from '@/models/SocialPost';
import AutomationRule, { AutomationFrequency, IAutomationRule } from '@/models/AutomationRule';
import AvatarProfile from '@/models/AvatarProfile';
import { generateSocialContent } from './contentGenerator';
import { publishToPlatform } from './publishers';

const FREQUENCY_MS: Record<AutomationFrequency, number> = {
  HOURLY: 60 * 60 * 1000,
  DAILY: 24 * 60 * 60 * 1000,
  EVERY_3_DAYS: 3 * 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
};

export function computeNextRun(frequency: AutomationFrequency, from: Date = new Date()): Date {
  return new Date(from.getTime() + FREQUENCY_MS[frequency]);
}

function pickTopic(topics: string[]): string {
  if (!topics.length) return 'a highlight or update from our business this week';
  return topics[Math.floor(Math.random() * topics.length)];
}

/**
 * Runs a single automation rule: generates `postsPerRun` pieces of content
 * (one per connected channel's platform, reusing the same generated caption
 * across channels of the same platform to avoid redundant AI calls),
 * creates SocialPost docs, and publishes immediately if autoPublish is set.
 * Used by both the "Run now" API action and the social-autopilot cron.
 */
export async function runAutomationRule(rule: IAutomationRule): Promise<{ postsCreated: number; errors: string[] }> {
  const errors: string[] = [];
  let postsCreated = 0;

  const channels = await SocialChannel.find({
    _id: { $in: rule.channelIds },
    businessId: rule.businessId,
    isActive: true,
  }).lean();

  if (channels.length === 0) {
    return { postsCreated: 0, errors: ['No active channels attached to this rule'] };
  }

  const avatar = rule.avatarId
    ? await AvatarProfile.findOne({ _id: rule.avatarId, businessId: rule.businessId }).lean()
    : await AvatarProfile.findOne({ businessId: rule.businessId, isDefault: true }).lean();

  const channelsByPlatform = new Map<string, typeof channels>();
  for (const ch of channels) {
    const list = channelsByPlatform.get(ch.platform) || [];
    list.push(ch);
    channelsByPlatform.set(ch.platform, list);
  }

  for (let i = 0; i < rule.postsPerRun; i++) {
    const topic = pickTopic(rule.topics);

    for (const [platform, platformChannels] of channelsByPlatform.entries()) {
      try {
        const generated = await generateSocialContent({
          businessId: rule.businessId.toString(),
          topic,
          platform,
          tone: rule.tone,
        });

        const channelIds = platformChannels.map((c) => c._id);

        const post = await SocialPost.create({
          businessId: rule.businessId,
          platform: platform as any,
          caption: generated.caption,
          imageUrl: (avatar as any)?.imageUrl || null,
          hashtags: generated.hashtags,
          status: rule.autoPublish ? 'DRAFT' : 'DRAFT',
          channelIds,
          avatarId: (avatar as any)?._id || null,
          topic,
          aiGenerated: true,
          automationRuleId: rule._id,
          createdBy: rule.createdBy,
        });

        postsCreated++;

        if (rule.autoPublish) {
          const channelResults: any[] = [];
          for (const channel of platformChannels) {
            const result = await publishToPlatform(
              platform as any,
              generated.caption,
              (avatar as any)?.imageUrl,
              channel.credentials || {}
            );
            channelResults.push({ channelId: channel._id, ...result });
            if (!result.success) errors.push(`${channel.name}: ${result.error}`);
          }
          const anySucceeded = channelResults.some((r) => r.success);
          post.status = anySucceeded ? 'POSTED' : 'FAILED';
          post.postedAt = anySucceeded ? new Date() : undefined;
          post.channelResults = channelResults;
          post.errorMessage = channelResults
            .filter((r) => !r.success)
            .map((r) => r.error)
            .join('; ') || undefined;
          await post.save();
        }
      } catch (err: any) {
        errors.push(`${platform}: ${err?.message || 'generation failed'}`);
      }
    }
  }

  if (rule.resharePastPosts) {
    try {
      const reshared = await reshareTopPerformer(rule);
      if (reshared) postsCreated++;
    } catch (err: any) {
      errors.push(`reshare: ${err?.message || 'failed'}`);
    }
  }

  rule.lastRunAt = new Date();
  rule.nextRunAt = computeNextRun(rule.frequency, new Date());
  await rule.save();

  return { postsCreated, errors };
}

/**
 * Picks the best-performing past post whose channels overlap this rule and
 * that hasn't been reshared within reshareCooldownDays, rewrites it with a
 * fresh caption (never literally reposts the same text -- keeps it reading
 * as a new, organic post rather than a duplicate), and republishes it to
 * the same channels. This is the "keep evergreen content circulating"
 * lever -- entirely the business's own content, no engagement manipulation.
 */
async function reshareTopPerformer(rule: IAutomationRule): Promise<boolean> {
  const cooldownCutoff = new Date(Date.now() - rule.reshareCooldownDays * 24 * 60 * 60 * 1000);

  const candidate = await SocialPost.findOne({
    businessId: rule.businessId,
    status: 'POSTED',
    channelIds: { $in: rule.channelIds },
    $or: [{ lastResharedAt: null }, { lastResharedAt: { $lte: cooldownCutoff } }],
    postedAt: { $lte: cooldownCutoff },
  })
    .sort({ engagementScore: -1, postedAt: 1 })
    .lean();

  if (!candidate) return false;

  const remix = await generateSocialContent({
    businessId: rule.businessId.toString(),
    topic: `Rewrite this as a fresh post with a new angle, same core message: ${candidate.caption}`,
    platform: candidate.platform,
    tone: rule.tone,
  });

  const targetChannels = await SocialChannel.find({
    _id: { $in: candidate.channelIds },
    isActive: true,
  }).lean();

  const channelResults: any[] = [];
  for (const channel of targetChannels) {
    const result = await publishToPlatform(channel.platform as any, remix.caption, candidate.imageUrl, channel.credentials || {});
    channelResults.push({ channelId: channel._id, ...result });
  }
  const anySucceeded = channelResults.some((r) => r.success);

  await SocialPost.create({
    businessId: rule.businessId,
    platform: candidate.platform,
    caption: remix.caption,
    imageUrl: candidate.imageUrl,
    hashtags: remix.hashtags,
    status: anySucceeded ? 'POSTED' : 'FAILED',
    postedAt: anySucceeded ? new Date() : undefined,
    channelIds: candidate.channelIds,
    channelResults,
    avatarId: candidate.avatarId,
    topic: candidate.topic,
    aiGenerated: true,
    automationRuleId: rule._id,
    resharedFromPostId: candidate._id,
    createdBy: rule.createdBy,
  });

  await SocialPost.updateOne({ _id: candidate._id }, { $set: { lastResharedAt: new Date() } });

  return true;
}

/**
 * Cron entry point: finds every active rule whose nextRunAt has passed and
 * runs it. Designed to be safe to call frequently (e.g. hourly) -- rules
 * simply no-op until their own nextRunAt is due.
 */
export async function runDueAutomationRules(): Promise<{ rulesRun: number; postsCreated: number; errors: string[] }> {
  const dueRules = await AutomationRule.find({
    isActive: true,
    nextRunAt: { $lte: new Date() },
  });

  let postsCreated = 0;
  const errors: string[] = [];

  for (const rule of dueRules) {
    const result = await runAutomationRule(rule);
    postsCreated += result.postsCreated;
    errors.push(...result.errors);
  }

  return { rulesRun: dueRules.length, postsCreated, errors };
}

/**
 * Publishes every SCHEDULED SocialPost whose scheduledAt has passed, across
 * all of its channelIds (multi-channel), falling back to nothing if the
 * post predates channelIds (legacy posts are published via the
 * /api/social/publish Integration-based flow, not here).
 */
export async function publishDueScheduledPosts(): Promise<{ published: number; failed: number }> {
  const duePosts = await SocialPost.find({
    status: 'SCHEDULED',
    scheduledAt: { $lte: new Date() },
    channelIds: { $exists: true, $ne: [] },
  });

  let published = 0;
  let failed = 0;

  for (const post of duePosts) {
    const channels = await SocialChannel.find({ _id: { $in: post.channelIds } }).lean();
    const channelResults: any[] = [];

    for (const channel of channels) {
      const result = await publishToPlatform(channel.platform as any, post.caption, post.imageUrl, channel.credentials || {});
      channelResults.push({ channelId: channel._id, ...result });
    }

    const anySucceeded = channelResults.some((r) => r.success);
    post.status = anySucceeded ? 'POSTED' : 'FAILED';
    post.postedAt = anySucceeded ? new Date() : undefined;
    post.channelResults = channelResults;
    post.errorMessage = channelResults
      .filter((r) => !r.success)
      .map((r) => r.error)
      .join('; ') || undefined;
    await post.save();

    if (anySucceeded) published++;
    else failed++;
  }

  return { published, failed };
}
