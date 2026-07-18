export type ServiceId = string;

export interface ServiceDefinition {
  id: ServiceId;
  label: string;
  repo: string;
  baseUrlEnvKey: string;
  kind: "ecommerce" | "mail" | "chat" | "devops" | "assistant" | "generic";
  enabled: boolean;
}

/**
 * Bots/assistants declared per-service. ANu (ANgroup) is real today —
 * src/core/anu/anuService.ts, multi-provider, POST /api/anu. Future bots
 * (an-communications-platform's own, AN-Technologies', etc.) get one entry
 * each here once their API is known; the Assistants tab lists whichever
 * are `enabled`.
 */
export interface AssistantDefinition {
  id: string;
  label: string;
  serviceId: ServiceId;
  enabled: boolean;
}

export const ASSISTANTS: AssistantDefinition[] = [
  {
    id: "anu",
    label: "ANu",
    serviceId: "angroup",
    enabled: true,
  },
];

/**
 * Every backend this app talks to is declared here. Adding a future repo
 * means adding one entry (and its baseUrl) — no app-code changes required.
 * baseUrls come from expo config extra, not hardcoded, so they can differ
 * per environment (dev/staging/prod) without a rebuild.
 */
export const SERVICES: ServiceDefinition[] = [
  {
    id: "angroup",
    label: "AN Group (storefront/orders)",
    repo: "nagarajukandula55/ANgroup",
    baseUrlEnvKey: "anApiUrl",
    kind: "ecommerce",
    enabled: true,
  },
  {
    id: "an-mail-platform",
    label: "AN Mail",
    repo: "nagarajukandula55/an-mail-platform",
    baseUrlEnvKey: "anMailApiUrl",
    kind: "mail",
    enabled: false,
  },
  {
    id: "an-communications-platform",
    label: "AN Communications",
    repo: "nagarajukandula55/an-communications-platform",
    baseUrlEnvKey: "anCommsApiUrl",
    kind: "chat",
    enabled: false,
  },
  {
    id: "an-technologies",
    label: "AN Technologies",
    repo: "nagarajukandula55/AN-Technologies",
    baseUrlEnvKey: "anTechApiUrl",
    kind: "generic",
    enabled: false,
  },
];

export function enabledServices(): ServiceDefinition[] {
  return SERVICES.filter((s) => s.enabled);
}
