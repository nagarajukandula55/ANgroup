import AIConfig from '@/models/AIConfig';

/**
 * Image-generation layer for AI brand avatars. Reuses the same
 * AIConfig.providers.openai/stabilityai keys already used by
 * /api/ai/generate-image (AI Image Studio) -- no separate credential store.
 */

export interface GenerateAvatarInput {
  businessId: string;
  prompt: string;
  style?: string;
  provider?: 'openai' | 'stabilityai';
}

export interface GeneratedAvatar {
  url: string;
  provider: string;
}

export async function generateAvatarImage(input: GenerateAvatarInput): Promise<GeneratedAvatar> {
  const { businessId, prompt, style, provider: requestedProvider } = input;
  const config = (await AIConfig.findOne({ businessId }).lean()) as any;
  const provider = requestedProvider || config?.defaultImageProvider || 'openai';
  const enhancedPrompt = style
    ? `Professional brand avatar / persona portrait: ${prompt}. Style: ${style}. Clean background, suitable as a profile picture.`
    : `Professional brand avatar / persona portrait: ${prompt}. Clean background, suitable as a profile picture.`;

  if (provider === 'openai') {
    const cfg = config?.providers?.openai;
    if (!cfg?.isEnabled || !cfg?.apiKey) {
      throw new Error('No image generation provider configured. Add an OpenAI or Stability AI key in Settings > AI.');
    }
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt: enhancedPrompt, n: 1, size: '1024x1024' }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `OpenAI API error: ${res.status}`);
    }
    const data = await res.json();
    const url = data?.data?.[0]?.url;
    if (!url) throw new Error('No image returned from OpenAI');
    return { url, provider: 'openai' };
  }

  if (provider === 'stabilityai') {
    const cfg = config?.providers?.stabilityai;
    if (!cfg?.isEnabled || !cfg?.apiKey) {
      throw new Error('No image generation provider configured. Add an OpenAI or Stability AI key in Settings > AI.');
    }
    const res = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ text_prompts: [{ text: enhancedPrompt }], width: 1024, height: 1024, samples: 1 }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.message || `Stability AI error: ${res.status}`);
    }
    const data = await res.json();
    const b64 = data?.artifacts?.[0]?.base64;
    if (!b64) throw new Error('No image returned from Stability AI');
    return { url: `data:image/png;base64,${b64}`, provider: 'stabilityai' };
  }

  throw new Error('No image generation provider configured. Add an OpenAI or Stability AI key in Settings > AI.');
}
