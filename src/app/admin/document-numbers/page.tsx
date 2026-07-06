"use client";

import React, { useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

// Previously only these 10 types were listed here even though the
// canonical numbering engine (src/core/numbering/types.ts) already
// supports 21 — this page is supposed to be the single place admins see
// EVERY numbering format the system uses, so it was silently hiding 11 of
// them (products, batches, stock moves, vendor/employee IDs, agreements,
// etc.) from view even though those types were already fully
// admin-configurable via the underlying API, just not surfaced in this UI.
type DocumentType =
  | "INVOICE"
  | "SALES_ORDER"
  | "PURCHASE_ORDER"
  | "GRN"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "QUOTATION"
  | "DELIVERY_CHALLAN"
  | "PAYMENT_RECEIPT"
  | "PRODUCTION_ORDER"
  | "PRODUCT"
  | "PRODUCT_VARIANT"
  | "VENDOR_PRODUCT"
  | "STOCK_ADJUSTMENT"
  | "STOCK_TRANSFER"
  | "BATCH"
  | "CUSTOMER_ORDER"
  | "RECEIPT"
  | "AGREEMENT"
  | "VENDOR"
  | "EMPLOYEE"
  | "BUSINESS"
  | "VENDOR_REQUEST";

interface DocumentConfig {
  documentType: DocumentType;
  prefix: string;
  separator: string;
  includeFinancialYear: boolean;
  includeMonth: boolean;
  sequenceLength: number;
  suffix: string;
  startFrom: number;
}

interface BusinessOption {
  _id: string;
  name: string;
  brandName?: string;
}

interface CardState {
  current: DocumentConfig;
  saved: DocumentConfig;
  isOpen: boolean;
  isSaving: boolean;
  successMsg: string | null;
  errorMsg: string | null;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  SALES_ORDER: "Sales Order",
  PURCHASE_ORDER: "Purchase Order",
  GRN: "Goods Receipt Note",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
  QUOTATION: "Quotation",
  DELIVERY_CHALLAN: "Delivery Challan",
  PAYMENT_RECEIPT: "Payment Receipt",
  PRODUCTION_ORDER: "Production Order",
  PRODUCT: "Product Code",
  PRODUCT_VARIANT: "Product Variant Code",
  VENDOR_PRODUCT: "Vendor Product Code",
  STOCK_ADJUSTMENT: "Stock Adjustment",
  STOCK_TRANSFER: "Stock Transfer",
  BATCH: "Batch Number",
  CUSTOMER_ORDER: "Customer Order",
  RECEIPT: "Receipt",
  AGREEMENT: "Agreement Number",
  VENDOR: "Vendor ID",
  EMPLOYEE: "Employee ID",
  BUSINESS: "Business Code",
  VENDOR_REQUEST: "Vendor Request Number",
};

const DEFAULT_CONFIGS: Record<DocumentType, DocumentConfig> = {
  INVOICE: {
    documentType: "INVOICE",
    prefix: "INV",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  SALES_ORDER: {
    documentType: "SALES_ORDER",
    prefix: "SO",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  PURCHASE_ORDER: {
    documentType: "PURCHASE_ORDER",
    prefix: "PO",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  GRN: {
    documentType: "GRN",
    prefix: "GRN",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  CREDIT_NOTE: {
    documentType: "CREDIT_NOTE",
    prefix: "CN",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  DEBIT_NOTE: {
    documentType: "DEBIT_NOTE",
    prefix: "DN",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  QUOTATION: {
    documentType: "QUOTATION",
    prefix: "QT",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  DELIVERY_CHALLAN: {
    documentType: "DELIVERY_CHALLAN",
    prefix: "DC",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  PAYMENT_RECEIPT: {
    documentType: "PAYMENT_RECEIPT",
    prefix: "PR",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  PRODUCTION_ORDER: {
    documentType: "PRODUCTION_ORDER",
    prefix: "PROD",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  // Prefixes below match src/core/numbering/types.ts's DEFAULT_PREFIXES —
  // the canonical numbering engine's own defaults — so this admin UI's
  // preview matches what the engine actually generates before a business
  // has explicitly saved its own override.
  PRODUCT: {
    documentType: "PRODUCT",
    prefix: "PRD",
    separator: "-",
    includeFinancialYear: false,
    includeMonth: false,
    sequenceLength: 5,
    suffix: "",
    startFrom: 1,
  },
  PRODUCT_VARIANT: {
    documentType: "PRODUCT_VARIANT",
    prefix: "VAR",
    separator: "-",
    includeFinancialYear: false,
    includeMonth: false,
    sequenceLength: 5,
    suffix: "",
    startFrom: 1,
  },
  VENDOR_PRODUCT: {
    documentType: "VENDOR_PRODUCT",
    prefix: "VPRD",
    separator: "-",
    includeFinancialYear: false,
    includeMonth: false,
    sequenceLength: 5,
    suffix: "",
    startFrom: 1,
  },
  STOCK_ADJUSTMENT: {
    documentType: "STOCK_ADJUSTMENT",
    prefix: "SA",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  STOCK_TRANSFER: {
    documentType: "STOCK_TRANSFER",
    prefix: "TRF",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  BATCH: {
    documentType: "BATCH",
    prefix: "BAT",
    separator: "-",
    includeFinancialYear: false,
    includeMonth: false,
    sequenceLength: 5,
    suffix: "",
    startFrom: 1,
  },
  CUSTOMER_ORDER: {
    documentType: "CUSTOMER_ORDER",
    prefix: "ORD",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  RECEIPT: {
    documentType: "RECEIPT",
    prefix: "RCT",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  AGREEMENT: {
    documentType: "AGREEMENT",
    prefix: "AGR",
    separator: "/",
    includeFinancialYear: true,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  VENDOR: {
    documentType: "VENDOR",
    prefix: "VND",
    separator: "-",
    includeFinancialYear: false,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  EMPLOYEE: {
    documentType: "EMPLOYEE",
    prefix: "EMP",
    separator: "-",
    includeFinancialYear: false,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  BUSINESS: {
    documentType: "BUSINESS",
    prefix: "BUS",
    separator: "-",
    includeFinancialYear: false,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
  VENDOR_REQUEST: {
    documentType: "VENDOR_REQUEST",
    prefix: "VREQ",
    separator: "-",
    includeFinancialYear: false,
    includeMonth: false,
    sequenceLength: 4,
    suffix: "",
    startFrom: 1,
  },
};

const DOCUMENT_TYPES: DocumentType[] = [
  "INVOICE",
  "SALES_ORDER",
  "PURCHASE_ORDER",
  "GRN",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
  "QUOTATION",
  "DELIVERY_CHALLAN",
  "PAYMENT_RECEIPT",
  "PRODUCTION_ORDER",
  "PRODUCT",
  "PRODUCT_VARIANT",
  "VENDOR_PRODUCT",
  "STOCK_ADJUSTMENT",
  "STOCK_TRANSFER",
  "BATCH",
  "CUSTOMER_ORDER",
  "RECEIPT",
  "AGREEMENT",
  "VENDOR",
  "EMPLOYEE",
  "BUSINESS",
  "VENDOR_REQUEST",
];

// ─── Preview Builder ──────────────────────────────────────────────────────────

function buildPreview(config: DocumentConfig): string {
  const {
    prefix,
    separator,
    includeFinancialYear,
    includeMonth,
    sequenceLength,
    suffix,
    startFrom,
  } = config;

  const parts: string[] = [];

  if (prefix) {
    parts.push(prefix);
  }

  if (includeFinancialYear) {
    parts.push("2024-25");
  }

  if (includeMonth) {
    parts.push("Apr");
  }

  if (suffix) {
    parts.push(suffix);
  }

  const seq = String(startFrom).padStart(sequenceLength, "0");
  parts.push(seq);

  return parts.join(separator);
}

// ─── Toggle Component ─────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left"
      aria-pressed={checked}
    >
      <div
        className={`relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? "bg-gray-900" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  cardState: CardState;
  onChange: (config: DocumentConfig) => void;
  onSave: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  businessId: string;
}

function DocumentCard({
  cardState,
  onChange,
  onSave,
  onReset,
  onToggleOpen,
}: DocumentCardProps) {
  const { current, isOpen, isSaving, successMsg, errorMsg } = cardState;
  const docType = current.documentType;
  const label = DOCUMENT_TYPE_LABELS[docType];
  const preview = buildPreview(current);

  const separatorOptions = ["-", "/", "."];
  const sequenceLengthOptions = [3, 4, 5, 6];

  const update = (partial: Partial<DocumentConfig>) => {
    onChange({ ...current, ...partial });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Card Header */}
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-900 font-medium text-sm">{label}</span>
          <span className="text-xs text-gray-400 font-mono">{docType}</span>
        </div>
        <div className="flex items-center gap-3">
          {!isOpen && (
            <span className="text-xs text-gray-400 font-mono">{preview}</span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Card Body */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {/* Preview */}
          <div className="mt-4 mb-5">
            <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">
              Preview
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-gray-900 text-sm">
              {preview}
            </div>
          </div>

          <div className="space-y-4">
            {/* Prefix & Suffix */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5">
                  Prefix
                </label>
                <input
                  type="text"
                  value={current.prefix}
                  onChange={(e) => update({ prefix: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="e.g. INV"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1.5">
                  Suffix
                </label>
                <input
                  type="text"
                  value={current.suffix}
                  onChange={(e) => update({ suffix: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Separator */}
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1.5">
                Separator
              </label>
              <div className="flex gap-2">
                {separatorOptions.map((sep) => (
                  <button
                    key={sep}
                    type="button"
                    onClick={() => update({ separator: sep })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      current.separator === sep
                        ? "bg-gray-900 text-white"
                        : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {sep}
                  </button>
                ))}
              </div>
            </div>

            {/* Sequence Length */}
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1.5">
                Sequence Length
              </label>
              <div className="flex gap-2">
                {sequenceLengthOptions.map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => update({ sequenceLength: len })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      current.sequenceLength === len
                        ? "bg-gray-900 text-white"
                        : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>

            {/* Start From */}
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1.5">
                Start From
              </label>
              <input
                type="number"
                min={1}
                value={current.startFrom}
                onChange={(e) =>
                  update({
                    startFrom: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-1">
              <Toggle
                checked={current.includeFinancialYear}
                onChange={(val) => update({ includeFinancialYear: val })}
                label="Include Financial Year (e.g. 2024-25)"
              />
              <Toggle
                checked={current.includeMonth}
                onChange={(val) => update({ includeMonth: val })}
                label="Include Month (e.g. Apr)"
              />
            </div>
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="mt-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={isSaving}
              className="border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentNumbersPage() {
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [noBusiness, setNoBusiness] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<BusinessOption[]>([]);
  const [cards, setCards] = useState<Record<DocumentType, CardState>>(() => {
    const initial: Partial<Record<DocumentType, CardState>> = {};
    for (const dt of DOCUMENT_TYPES) {
      const def = DEFAULT_CONFIGS[dt];
      initial[dt] = {
        current: { ...def },
        saved: { ...def },
        isOpen: false,
        isSaving: false,
        successMsg: null,
        errorMsg: null,
      };
    }
    return initial as Record<DocumentType, CardState>;
  });

  // ── Fetch on mount ────────────────────────────────────────────────────────

  const loadConfigsFor = async (bId: string, cancelledRef: { current: boolean }) => {
    try {
      const res = await fetch(
        `/api/admin/document-numbers?businessId=${encodeURIComponent(bId)}`
      );
      if (res.ok) {
        const data = await res.json();
        const configs: DocumentConfig[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.configs)
          ? data.configs
          : [];

        if (!cancelledRef.current && configs.length > 0) {
          setCards((prev) => {
            const next = { ...prev };
            for (const cfg of configs) {
              const dt = cfg.documentType as DocumentType;
              if (DOCUMENT_TYPES.includes(dt)) {
                const merged: DocumentConfig = {
                  ...DEFAULT_CONFIGS[dt],
                  ...cfg,
                  documentType: dt,
                };
                next[dt] = {
                  ...next[dt],
                  current: { ...merged },
                  saved: { ...merged },
                };
              }
            }
            return next;
          });
        }
      }
    } catch {
      // API error — keep defaults
    }
  };

  function handleSelectBusiness(bId: string) {
    setBusinessId(bId);
    setNoBusiness(false);
    setLoading(true);
    const ref = { current: false };
    loadConfigsFor(bId, ref).finally(() => setLoading(false));
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Step 1: get businessId + super admin status from the REAL
      // /api/auth/me shape — { success, user: { isSuperAdmin,
      // activeBusinessId }, businesses: [...] }. This previously read
      // data.businessId / data.business.id / data.user.businessId, none of
      // which exist on that response, so it always fell through to
      // "No business selected" — including for super admins, who should
      // default to "All Businesses" and pick one here instead of being
      // blocked outright.
      let bId: string | null = null;
      let superAdmin = false;
      let businesses: BusinessOption[] = [];
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          superAdmin = !!data?.user?.isSuperAdmin;
          businesses = data?.businesses || [];
          bId = data?.user?.activeBusinessId || (superAdmin ? null : businesses?.[0]?._id || null);
        }
      } catch {
        // network error — treat as no business
      }

      if (cancelled) return;

      setIsSuperAdmin(superAdmin);
      setAllBusinesses(businesses);

      if (!bId) {
        setNoBusiness(true);
        setLoading(false);
        return;
      }

      setBusinessId(bId);

      // Step 2: fetch document number configs
      try {
        const res = await fetch(
          `/api/admin/document-numbers?businessId=${encodeURIComponent(bId)}`
        );
        if (res.ok) {
          const data = await res.json();
          const configs: DocumentConfig[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.configs)
            ? data.configs
            : [];

          if (!cancelled && configs.length > 0) {
            setCards((prev) => {
              const next = { ...prev };
              for (const cfg of configs) {
                const dt = cfg.documentType as DocumentType;
                if (DOCUMENT_TYPES.includes(dt)) {
                  const merged: DocumentConfig = {
                    ...DEFAULT_CONFIGS[dt],
                    ...cfg,
                    documentType: dt,
                  };
                  next[dt] = {
                    ...next[dt],
                    current: { ...merged },
                    saved: { ...merged },
                  };
                }
              }
              return next;
            });
          }
        }
        // If response not ok or empty — keep defaults, fall through to setLoading(false)
      } catch {
        // API error — keep defaults, still stop loading
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Card handlers ─────────────────────────────────────────────────────────

  const handleChange = (docType: DocumentType, config: DocumentConfig) => {
    setCards((prev) => ({
      ...prev,
      [docType]: { ...prev[docType], current: config },
    }));
  };

  const handleToggleOpen = (docType: DocumentType) => {
    setCards((prev) => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        isOpen: !prev[docType].isOpen,
        successMsg: null,
        errorMsg: null,
      },
    }));
  };

  const handleReset = (docType: DocumentType) => {
    setCards((prev) => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        current: { ...prev[docType].saved },
        successMsg: null,
        errorMsg: null,
      },
    }));
  };

  const handleSave = async (docType: DocumentType) => {
    if (!businessId) return;

    setCards((prev) => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        isSaving: true,
        successMsg: null,
        errorMsg: null,
      },
    }));

    const config = cards[docType].current;

    try {
      const res = await fetch("/api/admin/document-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          documentType: docType,
          prefix: config.prefix,
          separator: config.separator,
          includeFinancialYear: config.includeFinancialYear,
          includeMonth: config.includeMonth,
          sequenceLength: config.sequenceLength,
          suffix: config.suffix,
          startFrom: config.startFrom,
        }),
      });

      if (res.ok) {
        setCards((prev) => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            saved: { ...config },
            isSaving: false,
            successMsg: "Settings saved successfully.",
            errorMsg: null,
          },
        }));
      } else {
        let msg = "Failed to save. Please try again.";
        try {
          const err = await res.json();
          if (err?.message) msg = err.message;
        } catch {
          // ignore parse errors
        }
        setCards((prev) => ({
          ...prev,
          [docType]: {
            ...prev[docType],
            isSaving: false,
            successMsg: null,
            errorMsg: msg,
          },
        }));
      }
    } catch {
      setCards((prev) => ({
        ...prev,
        [docType]: {
          ...prev[docType],
          isSaving: false,
          successMsg: null,
          errorMsg: "Network error. Please check your connection.",
        },
      }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <svg
            className="animate-spin w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">Loading document settings...</span>
        </div>
      </div>
    );
  }

  if (noBusiness) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No business selected
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {isSuperAdmin && allBusinesses.length > 0
              ? "Choose which business's document numbers to configure."
              : "Please select a business to manage document number settings."}
          </p>
          {isSuperAdmin && allBusinesses.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => e.target.value && handleSelectBusiness(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-400"
            >
              <option value="" disabled>Select a business…</option>
              {/* Platform-level configs (businessId: null) — for document
                  types like Agreement Number or Business Code that are
                  numbered across all of AN Group, not per-tenant. Only
                  visible to Super Admins, same pattern as the Integrations
                  page's "AN Group (Platform)" option. */}
              <option value="AN_GROUP">— AN Group (Platform) —</option>
              {allBusinesses.map((b) => (
                <option key={b._id} value={b._id}>{b.brandName || b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Document Numbers
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure numbering formats for each document type.
            </p>
          </div>
          {isSuperAdmin && allBusinesses.length > 0 && (
            <select
              value={businessId ?? ""}
              onChange={(e) => e.target.value && handleSelectBusiness(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-400"
            >
              <option value="AN_GROUP">— AN Group (Platform) —</option>
              {allBusinesses.map((b) => (
                <option key={b._id} value={b._id}>{b.brandName || b.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {DOCUMENT_TYPES.map((dt) => (
            <DocumentCard
              key={dt}
              cardState={cards[dt]}
              businessId={businessId!}
              onChange={(config) => handleChange(dt, config)}
              onSave={() => handleSave(dt)}
              onReset={() => handleReset(dt)}
              onToggleOpen={() => handleToggleOpen(dt)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
