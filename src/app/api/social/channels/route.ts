import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import SocialChannel from '@/models/SocialChannel';
import { logAction } from '@/lib/audit/logAction';

const VALID_PLATFORMS = ['INSTAGRAM', 'LINKEDIN', 'TWITTER', 'FACEBOOK', 'YOUTUBE'];

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

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const query: Record<string, unknown> = { businessId: new mongoose.Types.ObjectId(businessId) };
    if (platform && platform !== 'ALL') query.platform = platform;

    const channels = await SocialChannel.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('GET /api/social/channels error:', error);
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
    const { businessId, platform, name, avatarUrl, credentials } = body;

    if (!businessId || !platform || !name) {
      return NextResponse.json({ error: 'businessId, platform, and name are required' }, { status: 400 });
    }

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const creds = credentials || {};
    const isConnected = Boolean(creds.accessToken || creds.bearerToken);

    const channel = await SocialChannel.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      platform,
      name,
      avatarUrl: avatarUrl || null,
      externalPageId: creds.pageId || creds.channelId || null,
      credentials: creds,
      isActive: true,
      isConnected,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    logAction({
      action: 'CREATE',
      entity: 'SocialChannel',
      entityId: channel._id?.toString(),
      after: { platform: channel.platform, name: channel.name },
      req: request,
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error('POST /api/social/channels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
