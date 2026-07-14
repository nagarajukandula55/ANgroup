import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { generateSocialContent } from '@/core/social/contentGenerator';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, topic, platform, tone } = body;

    if (!businessId || !topic || !platform) {
      return NextResponse.json({ error: 'businessId, topic, and platform are required' }, { status: 400 });
    }

    const content = await generateSocialContent({ businessId, topic, platform, tone });

    return NextResponse.json(content);
  } catch (error: any) {
    console.error('POST /api/social/posts/generate error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
