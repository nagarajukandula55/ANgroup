"use client";

import { useEffect, useState } from "react";

interface StepCommercialProps {
  draftId: string;
  next: () => void;
  back: () => void;
}

interface CommercialForm {
  vendorSku: string;
  vendorCost: number;
  vendorShippingCost: number;
  shippingCostType: "SEPARATE" | "INCLUDED";
  minimumOrderQty: number;
  leadTimeDays: number;
  availableStock: number;
  mrp: number;
  suggestedSellingPrice: number;
}

interface PricingData {
  materialCost: number;
  wastageCost: number;
  vendorCost: number;
  shippingCost: number;
  totalBaseCost: number;
  marginPercent: number;
  marginAmount: number;
  sellingPrice: number;
}

const MARGIN_PRESETS = [20, 30, 40];

export default function StepCommercial({
  draftId,
  next,
  back,
}: StepCommercialProps) {
  const [form, setForm] = useState<CommercialForm>({
    vendorSku: "",
    vendorCost: 0,
    vendorShippingCost: 0,
    shippingCostType: "SEPARATE",
    minimumOrderQty: 1,
    leadTimeDays: 0,
    availableStock: 0,
    mrp: 0,
    suggestedSellingPrice: 0,
  });

  const [skuTouched, setSkuTouched] = useState(false);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [priceTouched, setPriceTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull the BOM-derived cost + a default margin-based suggestion from the
  // same cost/pricing engine StepBOM already established, instead of the
  // old disconnected manual "Vendor Cost" input with no link to actual
  // material cost.
  useEffect(() => {
    fetch(`/api/vendor-products/${draftId}/pricing`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPricing(d.data);
          if (!priceTouched && d.data?.sellingPrice) {
            setForm((prev) => ({
              ...prev,
              suggestedSellingPrice: Math.round(d.data.sellingPrice),
            }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setPricingLoading(false));
    // Only re-fetch when the draft changes — the vendor's own manual
    // overrides below shouldn't be clobbered by re-fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  // Auto-suggest a vendor SKU from the draft id until the vendor edits it.
  useEffect(() => {
    if (skuTouched || form.vendorSku) return;
    setForm((prev) => ({
      ...prev,
      vendorSku: `VP-${draftId.slice(-6).toUpperCase()}`,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const baseCost = pricing?.totalBaseCost ?? 0;

  const marginForPrice = (price: number) => {
    if (!baseCost || !price) return 0;
    return ((price - baseCost) / price) * 100;
  };

  const applyPreset = (marginPercent: number) => {
    const price = baseCost > 0 ? baseCost / (1 - marginPercent / 100) : 0;
    setPriceTouched(true);
    setForm((prev) => ({
      ...prev,
      suggestedSellingPrice: Math.round(price),
    }));
  };

  const handleSave = async () => {
    setError(null);
    try {
      setLoading(true);

      const res = await fetch(`/api/vendor-products/${draftId}/commercial`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to save — please try again");
        return;
      }

      next();
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border rounded p-2";
  const labelClass = "text-xs font-medium text-gray-500";

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Commercial Details
      </h2>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── BOM-derived cost, read-only ────────────────────────────── */}
      <div className="rounded border bg-gray-50 p-3 space-y-1">
        <p className="text-xs font-semibold text-gray-600">
          Computed Cost (from BOM)
        </p>
        {pricingLoading ? (
          <p className="text-sm text-gray-400">Loading cost…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">Material cost</span>
              <span className="text-right font-mono">
                ₹{(pricing?.materialCost ?? 0).toFixed(2)}
              </span>
              <span className="text-gray-500">Wastage</span>
              <span className="text-right font-mono">
                ₹{(pricing?.wastageCost ?? 0).toFixed(2)}
              </span>
              <span className="text-gray-500">Shipping</span>
              <span className="text-right font-mono">
                ₹{(pricing?.shippingCost ?? 0).toFixed(2)}
              </span>
              <span className="font-semibold text-gray-700">
                Total base cost
              </span>
              <span className="text-right font-mono font-semibold">
                ₹{baseCost.toFixed(2)}
              </span>
            </div>
            {baseCost <= 0 && (
              <p className="text-xs text-amber-600 pt-1">
                No BOM cost found yet — complete the BOM step first for an
                accurate pricing suggestion.
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>
          Vendor SKU{" "}
          <span className="text-gray-400 font-normal">
            (auto-suggested — edit if needed)
          </span>
        </label>
        <input
          className={`${inputClass} font-mono text-sm`}
          value={form.vendorSku}
          onChange={(e) => {
            setSkuTouched(true);
            setForm({ ...form, vendorSku: e.target.value });
          }}
        />
      </div>

      <input
        type="number"
        className={inputClass}
        placeholder="Vendor Cost (raw material / procurement input, feeds BOM)"
        value={form.vendorCost}
        onChange={(e) =>
          setForm({
            ...form,
            vendorCost: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className={inputClass}
        placeholder="Shipping Cost"
        value={form.vendorShippingCost}
        onChange={(e) =>
          setForm({
            ...form,
            vendorShippingCost: Number(e.target.value),
          })
        }
      />

      <select
        className={inputClass}
        value={form.shippingCostType}
        onChange={(e) =>
          setForm({
            ...form,
            shippingCostType: e.target
              .value as CommercialForm["shippingCostType"],
          })
        }
      >
        <option value="SEPARATE">Separate</option>
        <option value="INCLUDED">Included</option>
      </select>

      <input
        type="number"
        className={inputClass}
        placeholder="Minimum Order Qty"
        value={form.minimumOrderQty}
        onChange={(e) =>
          setForm({
            ...form,
            minimumOrderQty: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className={inputClass}
        placeholder="Lead Time (Days)"
        value={form.leadTimeDays}
        onChange={(e) =>
          setForm({
            ...form,
            leadTimeDays: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className={inputClass}
        placeholder="Available Stock"
        value={form.availableStock}
        onChange={(e) =>
          setForm({
            ...form,
            availableStock: Number(e.target.value),
          })
        }
      />

      {/* ── Pricing guidance ────────────────────────────────────────── */}
      <div className="rounded border p-3 space-y-3">
        <p className="text-xs font-semibold text-gray-600">
          Selling Price Guidance
        </p>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>MRP</label>
          <input
            type="number"
            className={inputClass}
            value={form.mrp}
            onChange={(e) =>
              setForm({ ...form, mrp: Number(e.target.value) })
            }
          />
        </div>

        <div className="flex gap-2">
          {MARGIN_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => applyPreset(m)}
              disabled={baseCost <= 0}
              className="rounded border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
            >
              {m}% margin
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Selling Price</label>
          <input
            type="number"
            className={inputClass}
            value={form.suggestedSellingPrice}
            onChange={(e) => {
              setPriceTouched(true);
              setForm({
                ...form,
                suggestedSellingPrice: Number(e.target.value),
              });
            }}
          />
        </div>

        {baseCost > 0 && form.suggestedSellingPrice > 0 && (
          <p className="text-sm">
            Margin at this price:{" "}
            <span
              className={`font-semibold ${
                marginForPrice(form.suggestedSellingPrice) < 0
                  ? "text-red-600"
                  : "text-green-700"
              }`}
            >
              {marginForPrice(form.suggestedSellingPrice).toFixed(1)}%
            </span>
            {marginForPrice(form.suggestedSellingPrice) < 0 && (
              <span className="text-red-600">
                {" "}
                — selling below cost
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={back}
          className="rounded border px-4 py-2"
        >
          Back
        </button>

        <button
          onClick={handleSave}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
