import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import SocialChannel from '@/models/SocialChannel';
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
      return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, avatarUrl, credentials, isActive, autopilotEnabled } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (autopilotEnabled !== undefined) updateData.autopilotEnabled = autopilotEnabled;
    if (credentials !== undefined) {
      updateData.credentials = credentials;
      updateData.isConnected = Boolean(credentials.accessToken || credentials.bearerToken);
    }

    const channel = await SocialChannel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    logAction({ action: 'UPDATE', entity: 'SocialChannel', entityId: id, after: channel, req: request });

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('PATCH /api/social/channels/[id] error:', error);
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
      return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 });
    }

    const channel = await SocialChannel.findByIdAndDelete(id);
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    logAction({ action: 'DELETE', entity: 'SocialChannel', entityId: id, before: channel, req: request });

    return NextResponse.json({ message: 'Channel removed' });
  } catch (error) {
    console.error('DELETE /api/social/channels/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
