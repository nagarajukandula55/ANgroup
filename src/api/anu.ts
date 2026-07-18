import { SERVICES } from "@/config/services";
import { serviceFetch } from "@/api/client";

const angroup = SERVICES.find((s) => s.id === "angroup")!;

export interface AnuMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AskAnuResponse {
  success: boolean;
  error?: string;
  reply?: string;
  provider?: string;
}

/**
 * Talks to ANu, the platform's existing in-house assistant
 * (src/core/anu/anuService.ts in ANgroup — multi-provider, grounded in the
 * business's enabled modules + its own knowledge base). This is the same
 * "bot" pipeline an-communications-platform reports failures through via
 * x-service-key, so future bots/assistants should follow this same
 * "one entry in services.ts, one thin client here" shape.
 */
export async function askAnu(
  businessId: string,
  messages: AnuMessage[],
  language?: string
): Promise<AskAnuResponse> {
  return serviceFetch<AskAnuResponse>(angroup, "/api/anu", {
    method: "POST",
    body: JSON.stringify({ businessId, messages, language }),
  });
}
