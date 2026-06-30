"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Hash,
  Save,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Info,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface DocConfig {
  _id?: string;
  businessId: string;
  documentType: string;
  prefix: string;
  separator: string;
  includeFinancialYear: boolean;
  includeMonth: boolean;
  sequenceLength: number;
  suffix: string;
  startFrom: number;
  isActive: boolean;
  formatPreview: string;
  _saved?: boolean;
}

const DOC_TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  INVOICE:           { label: "Sales Invoice",       desc: "Customer invoices / tax invoices" },
  SALES_ORDER:       { label: "Sales Order",          desc: "Customer orders" },
  PURCHASE_ORDER:    { label: "Purchase Order",       desc: "Vendor purchase orders" },
  GRN:               { label: "Goods Receipt Note",   desc: "Stock inward receipts" },
  CREDIT_NOTE:       { label: "Credit Note",          desc: "Refund / credit adjustments" },
  DEBIT_NOTE:        { label: "Debit Note",           desc: "Debit adjustments to vendor" },
  QUOTATION:         { label: "Quotation",            desc: "Customer price quotations" },
  DELIVERY_CHALLAN:  { label: "Delivery Challan",     desc: "Goods dispatch notes" },
  PAYMENT_RECEIPT:   { label: "Payment Receipt",      desc: "Payment acknowledgements" },
  PRODUCTION_ORDER:  { label: "Production Order",     desc: "Manufacturing / production orders" },
};

/* ─── Live preview builder ────────────────────────────────────────────────── */
function buildPreview(cfg: DocConfig): string {
  const sep = cfg.separator || "-";
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const nextFY = mo >= "04" ? `${yr}-${String(yr + 1).slice(2)}` : `${yr - 1}-${String(yr).slice(2)}`;
  const seq = "0".repeat(cfg.sequenceLength - 1) + "1";

  const parts: string[] = [];
  if (cfg.prefix) parts.push(cfg.prefix);
  if (cfg.includeFinancialYear) parts.push(nextFY);
  if (cfg.includeMonth) parts.push(mo);
  parts.push(seq);
  if (cfg.suffix) parts.push(cfg.suffix);
  return parts.join(sep);
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function DocumentNumbersPage() {
  const [configs, setConfigs] = useState<DocConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DocConfig>>({});

  const businessId =
    typeof window !== "undefined" ? localStorage.getItem("businessId") : null;

  const fetchConfigs = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/document-numbers?businessId=${businessId}`
      );
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data);
        const d: Record<string, DocConfig> = {};
        data.data.forEach((c: DocConfig) => {
          d[c.documentType] = { ...c };
        });
        setDrafts(d);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  function updateDraft(docType: string, field: keyof DocConfig, value: unknown) {
    setDrafts((prev) => {
      const updated = { ...prev[docType], [field]: value } as DocConfig;
      return { ...prev, [docType]: updated };
    });
  }

  async function saveConfig(docType: string) {
    const draft = drafts[docType];
    if (!draft || !businessId) return;
    setSaving(docType);
    try {
      const res = await fetch("/api/admin/document-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, businessId }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(docType);
        setTimeout(() => setSaved(null), 2000);
        await fetchConfigs();
      } else {
        alert(data.error || "Failed to save");
      }
    } finally {
      setSaving(null);
    }
  }

  function resetDraft(docType: string) {
    const original = configs.find((c) => c.documentType === docType);
    if (original) {
      setDrafts((prev) => ({ ...prev, [docType]: { ...original } }));
    }
  }

  const SEP_OPTIONS = ["-", "/", "_", ".", ""];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Hash size={20} className="text-zinc-400" />
            Document Number Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Configure how document numbers are auto-generated for each document type across your business
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm text-blue-300">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          Changes only affect <strong>new</strong> documents. Existing document numbers are never renumbered.
          Financial year resets the counter automatically each April 1.
        </span>
      </div>

      {/* Config cards */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500">Loading…</div>
      ) : (
        <div className="space-y-2">
          {configs.map((cfg) => {
            const draft = drafts[cfg.documentType] ?? cfg;
            const info = DOC_TYPE_LABELS[cfg.documentType] ?? {
              label: cfg.documentType,
              desc: "",
            };
            const isOpen = expanded === cfg.documentType;
            const preview = buildPreview(draft);
            const isSaving = saving === cfg.documentType;
            const isSaved = saved === cfg.documentType;

            return (
              <div
                key={cfg.documentType}
                className="rounded-xl border border-white/[0.06] overflow-hidden"
              >
                {/* Row header */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] text-left"
                  onClick={() =>
                    setExpanded(isOpen ? null : cfg.documentType)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {info.label}
                      </span>
                      {!cfg._saved && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                          default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{info.desc}</p>
                  </div>
                  {/* Preview pill */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <Eye size={11} className="text-zinc-500" />
                      <span className="font-mono text-xs text-zinc-300">
                        {preview}
                      </span>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown size={14} className="text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-zinc-500 shrink-0" />
                  )}
                </button>

                {/* Expanded editor */}
                {isOpen && (
                  <div className="border-t border-white/[0.06] px-5 py-5 bg-white/[0.01]">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 max-w-2xl">
                      {/* Prefix */}
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1">
                          Prefix
                        </label>
                        <input
                          value={draft.prefix}
                          onChange={(e) =>
                            updateDraft(cfg.documentType, "prefix", e.target.value.toUpperCase())
                          }
                          maxLength={10}
                          placeholder="e.g. INV"
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 font-mono uppercase"
                        />
                      </div>

                      {/* Separator */}
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1">
                          Separator
                        </label>
                        <div className="flex gap-1.5">
                          {SEP_OPTIONS.map((s) => (
                            <button
                              key={s === "" ? "none" : s}
                              onClick={() =>
                                updateDraft(cfg.documentType, "separator", s)
                              }
                              className={`flex-1 py-2 rounded-lg text-sm font-mono border transition-colors ${
                                draft.separator === s
                                  ? "border-white/30 bg-white/[0.08] text-white"
                                  : "border-white/[0.08] text-zinc-400 hover:text-white"
                              }`}
                            >
                              {s === "" ? "none" : s}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sequence length */}
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1">
                          Sequence digits
                        </label>
                        <div className="flex gap-1.5">
                          {[3, 4, 5, 6].map((n) => (
                            <button
                              key={n}
                              onClick={() =>
                                updateDraft(cfg.documentType, "sequenceLength", n)
                              }
                              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                                draft.sequenceLength === n
                                  ? "border-white/30 bg-white/[0.08] text-white"
                                  : "border-white/[0.08] text-zinc-400 hover:text-white"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          e.g. 4 digits → 0001, 0042
                        </p>
                      </div>

                      {/* Suffix */}
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1">
                          Suffix <span className="text-zinc-600">(optional)</span>
                        </label>
                        <input
                          value={draft.suffix}
                          onChange={(e) =>
                            updateDraft(cfg.documentType, "suffix", e.target.value)
                          }
                          maxLength={10}
                          placeholder="e.g. MUM, HQ"
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                        />
                      </div>

                      {/* Toggles */}
                      <div className="col-span-2 flex items-center gap-6">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <div
                            onClick={() =>
                              updateDraft(
                                cfg.documentType,
                                "includeFinancialYear",
                                !draft.includeFinancialYear
                              )
                            }
                            className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                              draft.includeFinancialYear
                                ? "bg-white"
                                : "bg-zinc-700"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full transition-transform ${
                                draft.includeFinancialYear
                                  ? "translate-x-4 bg-black"
                                  : "translate-x-0 bg-zinc-400"
                              }`}
                            />
                          </div>
                          <span className="text-sm text-zinc-300">
                            Include financial year
                          </span>
                          <span className="text-xs text-zinc-600">
                            (e.g. 2024-25)
                          </span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <div
                            onClick={() =>
                              updateDraft(
                                cfg.documentType,
                                "includeMonth",
                                !draft.includeMonth
                              )
                            }
                            className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                              draft.includeMonth ? "bg-white" : "bg-zinc-700"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full transition-transform ${
                                draft.includeMonth
                                  ? "translate-x-4 bg-black"
                                  : "translate-x-0 bg-zinc-400"
                              }`}
                            />
                          </div>
                          <span className="text-sm text-zinc-300">
                            Include month
                          </span>
                          <span className="text-xs text-zinc-600">
                            (e.g. 06)
                          </span>
                        </label>
                      </div>

                      {/* Live preview */}
                      <div className="col-span-2 flex items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <Eye size={14} className="text-zinc-500 shrink-0" />
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">
                            Preview
                          </p>
                          <p className="font-mono text-base text-white tracking-wide">
                            {preview}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-5">
                      <button
                        onClick={() => saveConfig(cfg.documentType)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100 disabled:opacity-50"
                      >
                        {isSaved ? (
                          <>
                            <CheckCircle size={14} className="text-emerald-600" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Save size={14} />
                            {isSaving ? "Saving…" : "Save Format"}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => resetDraft(cfg.documentType)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20"
                      >
                        <RotateCcw size={13} />
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
