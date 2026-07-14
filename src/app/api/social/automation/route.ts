import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import AutomationRule from '@/models/AutomationRule';
import { computeNextRun } from '@/core/social/automationEngine';
import { logAction } from '@/lib/audit/logAction';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const rules = await AutomationRule.find({ businessId: new mongoose.Types.ObjectId(businessId) })
      .populate('channelIds', 'name platform')
      .populate('avatarId', 'name imageUrl')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('GET /api/social/automation error:', error);
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
    const { businessId, name, channelIds, topics, tone, avatarId, frequency, postsPerRun, autoPublish } = body;

    if (!businessId || !name || !Array.isArray(channelIds) || channelIds.length === 0) {
      return NextResponse.json({ error: 'businessId, name, and at least one channelId are required' }, { status: 400 });
    }

    const rule = await AutomationRule.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      name,
      channelIds: channelIds.map((c: string) => new mongoose.Types.ObjectId(c)),
      topics: Array.isArray(topics) ? topics : [],
      tone: tone || 'professional',
      avatarId: avatarId ? new mongoose.Types.ObjectId(avatarId) : null,
      frequency: frequency || 'DAILY',
      postsPerRun: postsPerRun || 1,
      autoPublish: autoPublish !== undefined ? autoPublish : true,
      isActive: true,
      nextRunAt: computeNextRun(frequency || 'DAILY', new Date()),
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    logAction({ action: 'CREATE', entity: 'AutomationRule', entityId: rule._id?.toString(), after: rule, req: request });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('POST /api/social/automation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
