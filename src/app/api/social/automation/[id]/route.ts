import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import AutomationRule from '@/models/AutomationRule';
import { computeNextRun } from '@/core/social/automationEngine';
import { logAction } from '@/lib/audit/logAction';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, channelIds, topics, tone, avatarId, frequency, postsPerRun, autoPublish, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (channelIds !== undefined) updateData.channelIds = channelIds.map((c: string) => new mongoose.Types.ObjectId(c));
    if (topics !== undefined) updateData.topics = topics;
    if (tone !== undefined) updateData.tone = tone;
    if (avatarId !== undefined) updateData.avatarId = avatarId ? new mongoose.Types.ObjectId(avatarId) : null;
    if (postsPerRun !== undefined) updateData.postsPerRun = postsPerRun;
    if (autoPublish !== undefined) updateData.autoPublish = autoPublish;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (frequency !== undefined) {
      updateData.frequency = frequency;
      updateData.nextRunAt = computeNextRun(frequency, new Date());
    }

    const rule = await AutomationRule.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    logAction({ action: 'UPDATE', entity: 'AutomationRule', entityId: id, after: rule, req: request });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('PATCH /api/social/automation/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid rule ID' }, { status: 400 });
    }

    const rule = await AutomationRule.findByIdAndDelete(id);
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    logAction({ action: 'DELETE', entity: 'AutomationRule', entityId: id, before: rule, req: request });

    return NextResponse.json({ message: 'Rule removed' });
  } catch (error) {
    console.error('DELETE /api/social/automation/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
