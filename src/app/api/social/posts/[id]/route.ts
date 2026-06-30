import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import SocialPost from '@/models/SocialPost';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const post = await SocialPost.findOne({
      _id: new mongoose.Types.ObjectId(id),
      status: { $ne: 'DELETED' },
    }).lean();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('GET /api/social/posts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const body = await request.json();
    const { caption, imageUrl, hashtags, platform, scheduledAt, status } = body;

    const existingPost = await SocialPost.findOne({
      _id: new mongoose.Types.ObjectId(id),
      status: { $ne: 'DELETED' },
    });

    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.status === 'POSTED') {
      return NextResponse.json(
        { error: 'Cannot edit a post that has already been posted' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (caption !== undefined) updateData.caption = caption;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (hashtags !== undefined) updateData.hashtags = hashtags;
    if (platform !== undefined) updateData.platform = platform;
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      updateData.status = scheduledAt ? 'SCHEDULED' : 'DRAFT';
    }
    if (status !== undefined && ['DRAFT', 'SCHEDULED'].includes(status)) {
      updateData.status = status;
    }

    const updatedPost = await SocialPost.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    console.error('PUT /api/social/posts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const post = await SocialPost.findOne({
      _id: new mongoose.Types.ObjectId(id),
      status: { $ne: 'DELETED' },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    await SocialPost.findByIdAndUpdate(id, { $set: { status: 'DELETED' } });

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/social/posts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
