import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import SocialPost from '@/models/SocialPost';
import { logAction } from "@/lib/audit/logAction";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const query: Record<string, unknown> = {
      businessId: new mongoose.Types.ObjectId(businessId),
      status: { $ne: 'DELETED' },
    };

    if (platform && platform !== 'ALL') {
      query.platform = platform;
    }

    if (status) {
      query.status = status;
    }

    const [posts, total] = await Promise.all([
      SocialPost.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SocialPost.countDocuments(query),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [postedToday, scheduled, failed] = await Promise.all([
      SocialPost.countDocuments({
        businessId: new mongoose.Types.ObjectId(businessId),
        status: 'POSTED',
        postedAt: { $gte: today, $lt: tomorrow },
      }),
      SocialPost.countDocuments({
        businessId: new mongoose.Types.ObjectId(businessId),
        status: 'SCHEDULED',
      }),
      SocialPost.countDocuments({
        businessId: new mongoose.Types.ObjectId(businessId),
        status: 'FAILED',
      }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        postedToday,
        scheduled,
        failed,
      },
    });
  } catch (error) {
    console.error('GET /api/social/posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, platform, caption, imageUrl, hashtags, scheduledAt, channelIds, avatarId, topic, aiGenerated } = body;

    if (!businessId || !platform || !caption) {
      return NextResponse.json(
        { error: 'businessId, platform, and caption are required' },
        { status: 400 }
      );
    }

    const validPlatforms = ['INSTAGRAM', 'LINKEDIN', 'TWITTER', 'FACEBOOK', 'YOUTUBE', 'ALL'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const status = scheduledAt ? 'SCHEDULED' : 'DRAFT';

    const post = await SocialPost.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      platform,
      caption,
      imageUrl: imageUrl || null,
      hashtags: hashtags || [],
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      channelIds: Array.isArray(channelIds) ? channelIds.map((c: string) => new mongoose.Types.ObjectId(c)) : [],
      avatarId: avatarId ? new mongoose.Types.ObjectId(avatarId) : null,
      topic: topic || null,
      aiGenerated: Boolean(aiGenerated),
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    logAction({
      action: "CREATE",
      entity: "SocialPost",
      entityId: post._id?.toString(),
      after: post,
      req: request,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('POST /api/social/posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
