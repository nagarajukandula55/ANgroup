/**
 * Multi-provider AI orchestrator with failover.
 *
 * Tries providers in priority order (Groq -> Gemini -> OpenRouter), skipping
 * any that aren't configured (missing API key), and moving to the next
 * configured provider on any failure (network error, non-2xx response --
 * covers rate-limits/quota exhaustion without needing per-provider error
 * parsing). Returns as soon as one succeeds; if all configured providers
 * fail (or none are configured), returns an error object describing what
 * was tried -- callers should handle this gracefully, nothing here throws.
 */

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  call(prompt: string, systemPrompt?: string): Promise<string>;
}

type FailoverResult = { text: string; providerUsed: string } | { error: string };

class GroqProvider implements AIProvider {
  name = "groq";

  isConfigured(): boolean {
    return !!process.env.GROQ_API_KEY;
  }

  async call(prompt: string, systemPrompt?: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Groq request failed: ${res.status} ${res.statusText} ${body}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq response had no content");
    return text;
  }
}

class GeminiProvider implements AIProvider {
  name = "gemini";

  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }

  async call(prompt: string, systemPrompt?: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini request failed: ${res.status} ${res.statusText} ${body}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini response had no content");
    return text;
  }
}

class OpenRouterProvider implements AIProvider {
  name = "openrouter";

  isConfigured(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }

  async call(prompt: string, systemPrompt?: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenRouter request failed: ${res.status} ${res.statusText} ${body}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenRouter response had no content");
    return text;
  }
}

const PROVIDERS: AIProvider[] = [new GroqProvider(), new GeminiProvider(), new OpenRouterProvider()];

export async function callAIWithFailover(prompt: string, systemPrompt?: string): Promise<FailoverResult> {
  const configured = PROVIDERS.filter((p) => p.isConfigured());

  if (configured.length === 0) {
    return { error: "No AI provider is configured (GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY all unset)." };
  }

  const failures: string[] = [];

  for (const provider of configured) {
    try {
      const text = await provider.call(prompt, systemPrompt);
      return { text, providerUsed: provider.name };
    } catch (err: any) {
      const reason = err?.message || String(err);
      console.error(`[ai-orchestrator] provider "${provider.name}" failed: ${reason}`);
      failures.push(`${provider.name}: ${reason}`);
    }
  }

  return { error: `All configured AI providers failed. ${failures.join(" | ")}` };
}
