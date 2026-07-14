/**
 * Platform publish adapters, shared by both the legacy single-account
 * Integration flow (/api/social/publish) and the multi-channel SocialChannel
 * flow (/api/social/posts/[id]/publish-channels, the auto-pilot engine).
 * Each adapter takes a plain credential bag so it doesn't care whether the
 * credentials came from an Integration doc or a SocialChannel doc.
 */

export interface PublishCredentials {
  accessToken?: string;
  bearerToken?: string;
  pageId?: string;
  authorUrn?: string;
  userId?: string;
  channelId?: string; // YouTube channel id, when relevant
}

export interface PublishResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export async function publishToLinkedIn(
  caption: string,
  imageUrl: string | undefined,
  creds: PublishCredentials
): Promise<PublishResult> {
  try {
    const { accessToken, authorUrn } = creds;
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
            media: [{ status: 'READY', originalUrl: imageUrl }],
          }),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
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
      return { success: false, error: `LinkedIn API error: ${response.status} - ${JSON.stringify(errorData)}` };
    }

    const data = await response.json();
    return { success: true, externalId: data.id };
  } catch (error) {
    return { success: false, error: `LinkedIn publish failed: ${String(error)}` };
  }
}

export async function publishToTwitter(caption: string, creds: PublishCredentials): Promise<PublishResult> {
  try {
    const token = creds.accessToken || creds.bearerToken;
    if (!token) {
      return { success: false, error: 'Twitter/X bearer token not configured' };
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: caption }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: `Twitter API error: ${response.status} - ${JSON.stringify(errorData)}` };
    }

    const data = await response.json();
    return { success: true, externalId: data.data?.id };
  } catch (error) {
    return { success: false, error: `Twitter publish failed: ${String(error)}` };
  }
}

export async function publishToFacebook(
  caption: string,
  imageUrl: string | undefined,
  creds: PublishCredentials
): Promise<PublishResult> {
  try {
    const { accessToken, pageId } = creds;
    if (!accessToken || !pageId) {
      return { success: false, error: 'Facebook access token or page ID not configured' };
    }

    const endpoint = imageUrl
      ? `https://graph.facebook.com/v18.0/${pageId}/photos`
      : `https://graph.facebook.com/v18.0/${pageId}/feed`;

    const body: Record<string, string> = { access_token: accessToken, message: caption };
    if (imageUrl) body.url = imageUrl;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: `Facebook API error: ${response.status} - ${JSON.stringify(errorData)}` };
    }

    const data = await response.json();
    return { success: true, externalId: data.id };
  } catch (error) {
    return { success: false, error: `Facebook publish failed: ${String(error)}` };
  }
}

export async function publishToInstagram(
  caption: string,
  imageUrl: string | undefined,
  creds: PublishCredentials
): Promise<PublishResult> {
  try {
    const { accessToken, pageId } = creds;
    if (!accessToken || !pageId) {
      return { success: false, error: 'Instagram access token or page ID not configured' };
    }
    if (!imageUrl) {
      return { success: false, error: 'Instagram requires an image to post' };
    }

    const containerResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
    });

    if (!containerResponse.ok) {
      const errorData = await containerResponse.json().catch(() => ({}));
      return {
        success: false,
        error: `Instagram container creation error: ${containerResponse.status} - ${JSON.stringify(errorData)}`,
      };
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;

    const publishResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
    });

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json().catch(() => ({}));
      return { success: false, error: `Instagram publish error: ${publishResponse.status} - ${JSON.stringify(errorData)}` };
    }

    const publishData = await publishResponse.json();
    return { success: true, externalId: publishData.id };
  } catch (error) {
    return { success: false, error: `Instagram publish failed: ${String(error)}` };
  }
}

export async function publishToYouTube(
  caption: string,
  imageUrl: string | undefined,
  creds: PublishCredentials
): Promise<PublishResult> {
  // YouTube community posts / uploads require resumable multipart video
  // upload, not a simple JSON POST -- out of scope for text/image content.
  // Adapter kept here so the platform list stays uniform and future video
  // pipeline work has a single place to land.
  return { success: false, error: 'YouTube publishing requires a video upload pipeline (not yet configured)' };
}

export type Platform = 'INSTAGRAM' | 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'YOUTUBE';

export async function publishToPlatform(
  platform: Platform,
  caption: string,
  imageUrl: string | undefined,
  creds: PublishCredentials
): Promise<PublishResult> {
  switch (platform) {
    case 'LINKEDIN':
      return publishToLinkedIn(caption, imageUrl, creds);
    case 'TWITTER':
      return publishToTwitter(caption, creds);
    case 'FACEBOOK':
      return publishToFacebook(caption, imageUrl, creds);
    case 'INSTAGRAM':
      return publishToInstagram(caption, imageUrl, creds);
    case 'YOUTUBE':
      return publishToYouTube(caption, imageUrl, creds);
    default:
      return { success: false, error: `Unknown platform: ${platform}` };
  }
}
