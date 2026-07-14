import AIConfig from "@/models/AIConfig";
import type { AnuQueryInput, AnuQueryResult } from "./types";
import { buildAnuContext, localAnswer } from "./knowledgeBase";

/**
 * ANu's provider call layer. Deliberately thin: resolve which provider this
 * business has configured (via the EXISTING AIConfig model — reused, not
 * duplicated, same as the rest of this rebuild's "reuse what already works"
 * principle), call it, return a normalized result. Swapping/adding a
 * provider later means editing this file only — anuService's callers
 * (the API route, any future UI) never see provider-specific shapes.
 *
 * Anthropic is tried first (matches this platform's own stack), falling
 * back to OpenAI if only that's configured. If neither is configured for
 * this business, ANu returns a clear error rather than silently no-opping —
 * so the UI can prompt an admin to add an API key in Settings > AI instead
 * of looking broken.
 */

async function callAnthropic(apiKey: string, model: string, systemPrompt: string, messages: AnuQueryInput["messages"]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Anthropic API returned no content.");
  return text;
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, messages: AnuQueryInput["messages"]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI API returned no content.");
  return text;
}

export async function askAnu(input: AnuQueryInput): Promise<AnuQueryResult> {
  const aiConfig = await AIConfig.findOne({ businessId: input.businessId }).lean() as any;

  const anthropicCfg = aiConfig?.providers?.anthropic;
  const openaiCfg = aiConfig?.providers?.openai;

  const systemPrompt = await buildAnuContext(input.businessId, input.language);

  try {
    if (anthropicCfg?.isEnabled && anthropicCfg?.apiKey) {
      const reply = await callAnthropic(anthropicCfg.apiKey, anthropicCfg.model, systemPrompt, input.messages);
      return { reply, provider: "anthropic" };
    }

    if (openaiCfg?.isEnabled && openaiCfg?.apiKey) {
      const reply = await callOpenAI(openaiCfg.apiKey, openaiCfg.model, systemPrompt, input.messages);
      return { reply, provider: "openai" };
    }

    // No LLM provider configured for this business -- fall back to local
    // keyword retrieval over the same knowledge base instead of hard
    // erroring. Not the deferred "locally-hosted model" path (see
    // types.ts's decision note) -- plain text matching, no model involved.
    const lastUserMessage = [...input.messages].reverse().find((m) => m.role === "user");
    const localReply = lastUserMessage ? await localAnswer(input.businessId, lastUserMessage.content) : null;
    if (localReply) {
      return { reply: localReply, provider: "none" };
    }

    return {
      reply: "",
      provider: "none",
      error:
        "I don't have anything on that yet. Add an Anthropic or OpenAI API key from Admin > AI Studio (not Settings — that page only shows status) for full conversational answers, or teach me about this from the graduation-cap icon.",
    };
  } catch (err: any) {
    return {
      reply: "",
      provider: "none",
      error: err?.message || "ANu could not process this request.",
    };
  }
}
