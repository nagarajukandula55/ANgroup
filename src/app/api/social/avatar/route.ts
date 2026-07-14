import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import AvatarProfile from '@/models/AvatarProfile';
import { generateAvatarImage } from '@/core/social/avatarService';
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

    const avatars = await AvatarProfile.find({ businessId: new mongoose.Types.ObjectId(businessId) })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ avatars });
  } catch (error) {
    console.error('GET /api/social/avatar error:', error);
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
    const { businessId, name, prompt, style, provider, imageUrl, setDefault } = body;

    if (!businessId || !name) {
      return NextResponse.json({ error: 'businessId and name are required' }, { status: 400 });
    }

    let finalImageUrl = imageUrl;
    let source: 'AI_GENERATED' | 'UPLOADED' = 'UPLOADED';

    if (!finalImageUrl) {
      if (!prompt) {
        return NextResponse.json({ error: 'prompt is required to generate an avatar' }, { status: 400 });
      }
      const generated = await generateAvatarImage({ businessId, prompt, style, provider });
      finalImageUrl = generated.url;
      source = 'AI_GENERATED';
    }

    if (setDefault) {
      await AvatarProfile.updateMany({ businessId: new mongoose.Types.ObjectId(businessId) }, { $set: { isDefault: false } });
    }

    const avatar = await AvatarProfile.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      name,
      imageUrl: finalImageUrl,
      prompt: prompt || null,
      style: style || null,
      source,
      isDefault: Boolean(setDefault),
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    logAction({ action: 'CREATE', entity: 'AvatarProfile', entityId: avatar._id?.toString(), after: avatar, req: request });

    return NextResponse.json({ avatar }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/social/avatar error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
