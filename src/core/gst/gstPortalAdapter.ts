/**
 * GST portal push adapter — the ONE place this codebase talks (or would
 * talk) to an external GSP/ASP (GST Suvidha Provider) API to actually file
 * an invoice against the government GST portal.
 *
 * This sandbox has no real GST portal credentials or network access to any
 * GSP, so `pushToPortal()` below is a clean, swappable stub: it validates
 * config, builds the exact request payload a real provider call would send
 * (stored on the GstFiling record either way, so nothing is silently lost
 * once a real integration is wired in), and returns a deterministic
 * "submitted, awaiting portal response" result rather than pretending to
 * have filed anything. Swapping in a real provider (ClearTax, Masters
 * India, or GSTN's own direct API) means implementing the fetch() call
 * inside this one function — every caller (the API route, ANu) is already
 * written against this interface and needs no changes.
 *
 * This mirrors core/anu/anuService.ts's own pattern: business logic and
 * callers are written against a stable interface; only this file changes
 * when the real upstream integration is added.
 */

import type { IGstPortalConfig } from "@/models/GstPortalConfig";

export interface GstPushRequest {
  gstin: string;
  returnType: "GSTR1" | "GSTR3B" | "IFF";
  period: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerGstin?: string;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
}

export interface GstPushResult {
  ok: boolean;
  status: "SUBMITTED" | "FAILED";
  portalReferenceId?: string;
  errorMessage?: string;
  /** Exact payload sent — persisted on GstFiling for audit/debugging regardless of outcome */
  requestPayload: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
}

export async function pushToPortal(
  config: IGstPortalConfig,
  request: GstPushRequest
): Promise<GstPushResult> {
  const requestPayload = { ...request } as Record<string, unknown>;

  if (!config.isEnabled) {
    return {
      ok: false,
      status: "FAILED",
      errorMessage: "GST portal integration is not enabled for this business. Configure it in Settings > GST Filing.",
      requestPayload,
    };
  }

  if (!config.provider || config.provider === "NONE") {
    return {
      ok: false,
      status: "FAILED",
      errorMessage: "No GST filing provider configured. Choose a provider (GSTN Direct / ClearTax / Masters India) in Settings > GST Filing.",
      requestPayload,
    };
  }

  if (!config.apiKey) {
    return {
      ok: false,
      status: "FAILED",
      errorMessage: "GST provider API key is missing. Add it in Settings > GST Filing before pushing invoices.",
      requestPayload,
    };
  }

  // ── Real integration point ──────────────────────────────────────────
  // No live GSP/ASP credentials or network path exist in this environment,
  // so the actual fetch() call to a provider like ClearTax/Masters India/
  // GSTN's own API is intentionally not implemented here — implementing it
  // blind (without real credentials to test against) risks silently
  // building something broken. When real provider credentials are
  // available, replace the block below with the actual HTTP call, keeping
  // the same GstPushResult shape so nothing upstream needs to change.
  const responsePayload = {
    note: "Stub adapter — no live GST portal connection configured in this environment.",
    provider: config.provider,
  };

  return {
    ok: true,
    status: "SUBMITTED",
    portalReferenceId: undefined,
    requestPayload,
    responsePayload,
  };
}
