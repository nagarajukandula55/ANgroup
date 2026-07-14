import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import SocialPost from '@/models/SocialPost';
import SocialChannel from '@/models/SocialChannel';
import { publishToPlatform } from '@/core/social/publishers';
import { logAction } from '@/lib/audit/logAction';

/**
 * Multi-channel publish: unlike /api/social/publish (legacy, one
 * Integration per platform), this publishes to every specific
 * SocialChannel doc attached to the post -- so a single post can go out to
 * three different Facebook Pages plus two Instagram accounts in one call.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedChannelIds: string[] | undefined = body.channelIds;

    const post = await SocialPost.findOne({ _id: new mongoose.Types.ObjectId(id), status: { $nin: ['DELETED', 'POSTED'] } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found or already posted' }, { status: 404 });
    }

    const channelIds = requestedChannelIds?.length ? requestedChannelIds : post.channelIds.map((c) => c.toString());
    if (!channelIds.length) {
      return NextResponse.json({ error: 'No channels specified for this post' }, { status: 400 });
    }

    const channels = await SocialChannel.find({
      _id: { $in: channelIds },
      businessId: post.businessId,
      isActive: true,
    }).lean();

    const channelResults: { channelId: string; success: boolean; externalId?: string; error?: string }[] = [];

    for (const channel of channels) {
      const result = await publishToPlatform(channel.platform as any, post.caption, post.imageUrl, channel.credentials || {});
      channelResults.push({ channelId: channel._id.toString(), ...result });
    }

    const anySucceeded = channelResults.some((r) => r.success);
    const allSucceeded = channelResults.every((r) => r.success);

    post.status = anySucceeded ? 'POSTED' : 'FAILED';
    post.postedAt = anySucceeded ? new Date() : undefined;
    post.channelResults = channelResults as any;
    post.errorMessage = channelResults.filter((r) => !r.success).map((r) => r.error).join('; ') || undefined;
    await post.save();

    logAction({ action: 'PUBLISH', entity: 'SocialPost', entityId: id, after: { status: post.status, channelResults }, req: request });

    return NextResponse.json({
      channelResults,
      overallStatus: post.status,
      message: allSucceeded
        ? 'Published to all channels successfully'
        : anySucceeded
        ? 'Published to some channels with partial failures'
        : 'Failed to publish to all channels',
    });
  } catch (error) {
    console.error('POST /api/social/posts/[id]/publish-channels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
