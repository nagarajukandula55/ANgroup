import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import SocialPost from '@/models/SocialPost';

interface IntegrationConfig {
  accessToken?: string;
  bearerToken?: string;
  pageId?: string;
  authorUrn?: string;
  userId?: string;
}

interface IntegrationDoc {
  provider: string;
  businessId: mongoose.Types.ObjectId;
  config: IntegrationConfig;
  isActive: boolean;
}

async function getIntegrationConfig(
  businessId: string,
  provider: string
): Promise<IntegrationConfig | null> {
  try {
    const IntegrationModel = mongoose.models.Integration;
    if (!IntegrationModel) return null;

    const integration = await IntegrationModel.findOne({
      businessId: new mongoose.Types.ObjectId(businessId),
      provider: provider.toLowerCase(),
      isActive: true,
    }).lean() as IntegrationDoc | null;

    return integration ? integration.config : null;
  } catch {
    return null;
  }
}

async function publishToLinkedIn(
  caption: string,
  imageUrl: string | undefined,
  config: IntegrationConfig
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const { accessToken, authorUrn } = config;
    if (!accessToken || !authorUrn) {
      return { success: false, error: 'LinkedIn access token or author URN not configured' };
    }

    const postBody: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: caption },
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
          ...(imageUrl && {
            media: [
              {
                status: 'READY',
                originalUrl: imageUrl,
              },
            ],
          }),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `LinkedIn API error: ${response.status} - ${JSON.stringify(errorData)}`,
      };
    }

    const data = await response.json();
    return { success: true, externalId: data.id };
  } catch (error) {
    return { success: false, error: `LinkedIn publish failed: ${String(error)}` };
  }
}

async function publishToTwitter(
  caption: string,
  config: IntegrationConfig
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const { bearerToken, accessToken } = config;
    const token = accessToken || bearerToken;

    if (!token) {
      return { success: false, error: 'Twitter/X bearer token not configured' };
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: caption }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Twitter API error: ${response.status} - ${JSON.stringify(errorData)}`,
      };
    }

    const data = await response.json();
    return { success: true, externalId: data.data?.id };
  } catch (error) {
    return { success: false, error: `Twitter publish failed: ${String(error)}` };
  }
}

async function publishToFacebook(
  caption: string,
  imageUrl: string | undefined,
  config: IntegrationConfig
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const { accessToken, pageId } = config;
    if (!accessToken || !pageId) {
      return { success: false, error: 'Facebook access token or page ID not configured' };
    }

    const endpoint = imageUrl
      ? `https://graph.facebook.com/v18.0/${pageId}/photos`
      : `https://graph.facebook.com/v18.0/${pageId}/feed`;

    const body: Record<string, string> = {
      access_token: accessToken,
      message: caption,
    };

    if (imageUrl) {
      body.url = imageUrl;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Facebook API error: ${response.status} - ${JSON.stringify(errorData)}`,
      };
    }

    const data = await response.json();
    return { success: true, externalId: data.id };
  } catch (error) {
    return { success: false, error: `Facebook publish failed: ${String(error)}` };
  }
}

async function publishToInstagram(
  caption: string,
  imageUrl: string | undefined,
  config: IntegrationConfig
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    const { accessToken, pageId } = config;
    if (!accessToken || !pageId) {
      return { success: false, error: 'Instagram access token or page ID not configured' };
    }

    if (!imageUrl) {
      return { success: false, error: 'Instagram requires an image to post' };
    }

    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      const errorData = await containerResponse.json().catch(() => ({}));
      return {
        success: false,
        error: `Instagram container creation error: ${containerResponse.status} - ${JSON.stringify(errorData)}`,
      };
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;

    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json().catch(() => ({}));
      return {
        success: false,
        error: `Instagram publish error: ${publishResponse.status} - ${JSON.stringify(errorData)}`,
      };
    }

    const publishData = await publishResponse.json();
    return { success: true, externalId: publishData.id };
  } catch (error) {
    return { success: false, error: `Instagram publish failed: ${String(error)}` };
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
    const { postId, platforms } = body;

    if (!postId || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'postId and platforms array are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const post = await SocialPost.findOne({
      _id: new mongoose.Types.ObjectId(postId),
      status: { $nin: ['DELETED', 'POSTED'] },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found or already posted' }, { status: 404 });
    }

    const businessId = post.businessId.toString();
    const results: Record<string, { success: boolean; externalId?: string; error?: string }> = {};

    const publishPlatforms =
      platforms.includes('ALL')
        ? ['INSTAGRAM', 'LINKEDIN', 'TWITTER', 'FACEBOOK']
        : platforms;

    for (const platform of publishPlatforms) {
      const config = await getIntegrationConfig(businessId, platform);

      if (!config) {
        results[platform] = {
          success: false,
          error: `No active integration configured for ${platform}`,
        };
        continue;
      }

      switch (platform.toUpperCase()) {
        case 'LINKEDIN':
          results[platform] = await publishToLinkedIn(
            post.caption,
            post.imageUrl || undefined,
            config
          );
          break;
        case 'TWITTER':
          results[platform] = await publishToTwitter(post.caption, config);
          break;
        case 'FACEBOOK':
          results[platform] = await publishToFacebook(
            post.caption,
            post.imageUrl || undefined,
            config
          );
          break;
        case 'INSTAGRAM':
          results[platform] = await publishToInstagram(
            post.caption,
            post.imageUrl || undefined,
            config
          );
          break;
        default:
          results[platform] = { success: false, error: `Unknown platform: ${platform}` };
      }
    }

    const allSucceeded = Object.values(results).every((r) => r.success);
    const anySucceeded = Object.values(results).some((r) => r.success);

    const firstSuccessResult = Object.values(results).find((r) => r.success);
    const firstErrorResult = Object.values(results).find((r) => !r.success);

    const newStatus = allSucceeded ? 'POSTED' : anySucceeded ? 'POSTED' : 'FAILED';

    await SocialPost.findByIdAndUpdate(postId, {
      $set: {
        status: newStatus,
        postedAt: anySucceeded ? new Date() : undefined,
        externalPostId: firstSuccessResult?.externalId || undefined,
        errorMessage: !allSucceeded
          ? Object.entries(results)
              .filter(([, r]) => !r.success)
              .map(([p, r]) => `${p}: ${r.error}`)
              .join('; ')
          : null,
      },
    });

    return NextResponse.json({
      results,
      overallStatus: newStatus,
      message: allSucceeded
        ? 'Published to all platforms successfully'
        : anySucceeded
        ? 'Published to some platforms with partial failures'
        : 'Failed to publish to all platforms',
    });
  } catch (error) {
    console.error('POST /api/social/publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
