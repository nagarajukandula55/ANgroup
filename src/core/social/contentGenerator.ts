import AIConfig from '@/models/AIConfig';

/**
 * Text-generation layer for social content. Tries the business's own
 * Anthropic/OpenAI key from AIConfig first (same model reused by ANu --
 * see core/anu/anuService.ts); falls back to the free Pollinations text
 * endpoint already used by /api/ai/caption so content generation never
 * hard-fails a business that hasn't configured a key yet.
 */

export interface GenerateContentInput {
  businessId: string;
  topic: string;
  platform: string;
  tone?: string;
}

export interface GeneratedContent {
  caption: string;
  hashtags: string[];
  provider: string;
}

const PLATFORM_GUIDELINES: Record<string, string> = {
  INSTAGRAM: 'Instagram (max 2200 chars, engaging line breaks, end with 5-10 relevant hashtags)',
  LINKEDIN: 'LinkedIn (professional tone, max 3000 chars, 3-5 relevant hashtags)',
  TWITTER: 'Twitter/X (max 280 chars including hashtags, punchy, 1-2 hashtags)',
  FACEBOOK: 'Facebook (conversational, max 500 chars, 2-3 hashtags optional)',
  YOUTUBE: 'YouTube community post (short, engaging, 2-3 hashtags)',
  ALL: 'social media (engaging, versatile, works across platforms, 3-5 hashtags)',
};

function buildPrompt(topic: string, platform: string, tone: string): { system: string; user: string } {
  const guide = PLATFORM_GUIDELINES[platform.toUpperCase()] || `${platform} social media platform`;
  return {
    system:
      'You are an expert social media copywriter. Return ONLY the caption text followed by a new line and the hashtags separated by spaces, each starting with #. No explanations.',
    user: `Write an engaging ${guide} post about: ${topic}\nTone: ${tone}`,
  };
}

function splitCaptionAndHashtags(raw: string): { caption: string; hashtags: string[] } {
  const cleaned = raw.trim().replace(/^["']|["']$/g, '');
  const hashtagMatches = cleaned.match(/#[\w]+/g) || [];
  const hashtags = [...new Set(hashtagMatches.map((h) => h.replace('#', '')))];
  const caption = cleaned.replace(/#[\w]+/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return { caption, hashtags };
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Anthropic returned no content');
  return text;
}

async function callOpenAI(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned no content');
  return text;
}

async function callPollinations(system: string, user: string): Promise<string> {
  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model: 'openai',
      stream: false,
    }),
  });
  if (!res.ok) throw new Error('Pollinations service unavailable');
  return (await res.text()).trim();
}

export async function generateSocialContent(input: GenerateContentInput): Promise<GeneratedContent> {
  const { businessId, topic, platform, tone = 'professional' } = input;
  const { system, user } = buildPrompt(topic, platform, tone);

  const aiConfig = (await AIConfig.findOne({ businessId }).lean()) as any;
  const anthropicCfg = aiConfig?.providers?.anthropic;
  const openaiCfg = aiConfig?.providers?.openai;

  let raw: string;
  let provider: string;

  try {
    if (anthropicCfg?.isEnabled && anthropicCfg?.apiKey) {
      raw = await callAnthropic(anthropicCfg.apiKey, anthropicCfg.model, system, user);
      provider = 'anthropic';
    } else if (openaiCfg?.isEnabled && openaiCfg?.apiKey) {
      raw = await callOpenAI(openaiCfg.apiKey, openaiCfg.model, system, user);
      provider = 'openai';
    } else {
      raw = await callPollinations(system, user);
      provider = 'pollinations';
    }
  } catch {
    raw = await callPollinations(system, user);
    provider = 'pollinations';
  }

  const { caption, hashtags } = splitCaptionAndHashtags(raw);
  return { caption, hashtags, provider };
}
