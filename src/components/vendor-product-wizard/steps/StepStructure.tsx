"use client";

import { useState } from "react";

interface StepStructureProps {
  draftId: string;
  businessId?: string;
  next: () => void;
  back: () => void;
}

interface StructureForm {
  unit: string;
  packSize: number;
  netWeight: number;
  grossWeight: number;
  hsnCode: string;
  gstRate: number;
}

export default function StepStructure({
  draftId,
  businessId,
  next,
  back,
}: StepStructureProps) {
  const [form, setForm] = useState<StructureForm>({
    unit: "",
    packSize: 1,
    netWeight: 0,
    grossWeight: 0,
    hsnCode: "",
    gstRate: 0,
  });

  const [loading, setLoading] = useState(false);
  const [gstLookupStatus, setGstLookupStatus] = useState<
    "idle" | "loading" | "found" | "not-found"
  >("idle");

  // Auto-lookup GST rate from the HSN code via the same HsnTaxRate model
  // this session's CRM module built (models/HsnTaxRate.ts, GET
  // /api/hsn-tax-rates) — fired when the vendor finishes typing an HSN
  // code, so GST rate isn't left as a manual guess.
  const lookupGst = async (hsnCode: string) => {
    if (!hsnCode.trim()) return;
    setGstLookupStatus("loading");
    try {
      const params = new URLSearchParams({ hsnCode: hsnCode.trim() });
      if (businessId) params.set("businessId", businessId);
      const res = await fetch(`/api/hsn-tax-rates?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (data.success && data.rate) {
        setForm((prev) => ({
          ...prev,
          gstRate: data.rate.gstRate ?? data.rate.taxRate ?? prev.gstRate,
        }));
        setGstLookupStatus("found");
      } else {
        setGstLookupStatus("not-found");
      }
    } catch {
      setGstLookupStatus("not-found");
    }
  };

  const handleSave = async () => {
    setLoading(true);

    await fetch(`/api/vendor-products/${draftId}/structure`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);
    next();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Product Structure & Taxation
      </h2>

      <input
        className="w-full border p-2 rounded"
        placeholder="Unit (kg, g, ml, pcs)"
        value={form.unit}
        onChange={(e) =>
          setForm({
            ...form,
            unit: e.target.value,
          })
        }
      />

      <input
        type="number"
        className="w-full border p-2 rounded"
        placeholder="Pack Size"
        value={form.packSize}
        onChange={(e) =>
          setForm({
            ...form,
            packSize: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className="w-full border p-2 rounded"
        placeholder="Net Weight"
        value={form.netWeight}
        onChange={(e) =>
          setForm({
            ...form,
            netWeight: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className="w-full border p-2 rounded"
        placeholder="Gross Weight"
        value={form.grossWeight}
        onChange={(e) =>
          setForm({
            ...form,
            grossWeight: Number(e.target.value),
          })
        }
      />

      <div className="flex flex-col gap-1">
        <input
          className="w-full border p-2 rounded"
          placeholder="HSN Code"
          value={form.hsnCode}
          onChange={(e) =>
            setForm({
              ...form,
              hsnCode: e.target.value,
            })
          }
          onBlur={(e) => lookupGst(e.target.value)}
        />
        {gstLookupStatus === "loading" && (
          <p className="text-xs text-gray-400">Looking up GST rate…</p>
        )}
        {gstLookupStatus === "found" && (
          <p className="text-xs text-green-600">
            GST rate auto-filled from HSN lookup — override below if needed.
          </p>
        )}
        {gstLookupStatus === "not-found" && (
          <p className="text-xs text-amber-600">
            No matching HSN rate found — enter GST rate manually.
          </p>
        )}
      </div>

      <input
        type="number"
        className="w-full border p-2 rounded"
        placeholder="GST Rate (%)"
        value={form.gstRate}
        onChange={(e) =>
          setForm({
            ...form,
            gstRate: Number(e.target.value),
          })
        }
      />

      <div className="flex justify-between pt-4">
        <button
          onClick={back}
          className="px-4 py-2 border rounded"
        >
          Back
        </button>

        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
