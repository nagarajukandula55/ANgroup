import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import AvatarProfile from '@/models/AvatarProfile';
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
      return NextResponse.json({ error: 'Invalid avatar ID' }, { status: 400 });
    }

    const avatar = await AvatarProfile.findById(id);
    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    const body = await request.json();
    if (body.setDefault) {
      await AvatarProfile.updateMany({ businessId: avatar.businessId }, { $set: { isDefault: false } });
      avatar.isDefault = true;
      await avatar.save();
    }
    if (body.name !== undefined) {
      avatar.name = body.name;
      await avatar.save();
    }

    logAction({ action: 'UPDATE', entity: 'AvatarProfile', entityId: id, after: avatar, req: request });

    return NextResponse.json({ avatar });
  } catch (error) {
    console.error('PATCH /api/social/avatar/[id] error:', error);
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
      return NextResponse.json({ error: 'Invalid avatar ID' }, { status: 400 });
    }

    const avatar = await AvatarProfile.findByIdAndDelete(id);
    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    logAction({ action: 'DELETE', entity: 'AvatarProfile', entityId: id, before: avatar, req: request });

    return NextResponse.json({ message: 'Avatar removed' });
  } catch (error) {
    console.error('DELETE /api/social/avatar/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
