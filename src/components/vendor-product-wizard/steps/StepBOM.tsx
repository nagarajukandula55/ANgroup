"use client";

import { useEffect, useState } from "react";

import BOMRow from "./components/BOMRow";
import CostSummary from "./components/CostSummary";
import PricingPreview from "./components/PricingPreview";

interface BOMItem {
  bomId?: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  wastagePercent: number;
  currentRate: number;
  materialType: "INGREDIENT" | "PACKAGING" | "OTHER";
}

interface CostSummaryType {
  totalMaterialCost: number;
  wastageCost: number;
  finalCost: number;
}

interface PricingType {
  sellingPrice: number;
  marginAmount: number;
  marginPercent: number;
}

interface Props {
  draftId: string;
  businessId?: string;
  next: () => void;
  back: () => void;
}

export default function StepBOM({
  draftId,
  businessId,
  next,
  back,
}: Props) {
  const [rows, setRows] = useState<BOMItem[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [savedFlash, setSavedFlash] = useState<number | null>(null);

  const [costSummary, setCostSummary] =
    useState<CostSummaryType>({
      totalMaterialCost: 0,
      wastageCost: 0,
      finalCost: 0,
    });

  const [pricing, setPricing] =
    useState<PricingType>({
      sellingPrice: 0,
      marginAmount: 0,
      marginPercent: 0,
    });

  /* ================= LOAD CURRENT USER ================= */
  // Was sending the literal string "TEMP" for both businessId and
  // createdBy on every BOM row save -- businessId cast to ObjectId would
  // fail Mongoose validation, and even where it silently passed through,
  // the BOM was never actually tied to the real business/user. Resolve
  // both from the authenticated session instead.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserId(d?.user?.id || ""))
      .catch(() => {});
  }, []);

  /* ================= LOAD BOM ================= */

  const fetchBOM = async () => {
    const res = await fetch(
      `/api/vendor-products/${draftId}/bom`
    );

    const data = await res.json();

    if (!data.success) return;

    setRows(
      data.data.map((item: any) => ({
        bomId: item._id,
        materialId: item.materialId?._id || "",
        materialName: item.materialName || "",
        unit: item.unit || "",
        quantity: item.quantity || 1,
        wastagePercent:
          item.wastagePercent || 0,
        currentRate:
          item.currentRate || 0,
        materialType:
          item.materialType || "INGREDIENT",
      }))
    );
  };

  /* ================= COST ================= */

  const fetchCost = async () => {
    const res = await fetch(
      `/api/vendor-products/${draftId}/cost`
    );

    const data = await res.json();

    if (data.success) {
      setCostSummary(data.data);
    }
  };

  /* ================= PRICING ================= */

  const fetchPricing = async () => {
    const res = await fetch(
      `/api/vendor-products/${draftId}/pricing`
    );

    const data = await res.json();

    if (data.success) {
      setPricing(data.data);
    }
  };

  useEffect(() => {
    fetchBOM();
  }, []);

  useEffect(() => {
    fetchCost();
    fetchPricing();
  }, [rows]);

  /* ================= ROW ================= */

  const addRow = () => {
    setRows([
      ...rows,
      {
        materialId: "",
        materialName: "",
        unit: "",
        quantity: 1,
        wastagePercent: 0,
        currentRate: 0,
        materialType: "INGREDIENT",
      },
    ]);
  };

  const updateRow = (
    index: number,
    field: keyof BOMItem,
    value: string | number
  ) => {
    const updated = [...rows];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setRows(updated);
  };

  /* ================= SAVE ================= */

  const saveRow = async (row: BOMItem, index: number) => {
    setRowErrors((prev) => ({ ...prev, [index]: "" }));

    if (!row.materialId) {
      setRowErrors((prev) => ({ ...prev, [index]: "Select a material first — search above by name." }));
      return;
    }

    // currentCost is what the cost/pricing engine downstream actually
    // reads (previously always hardcoded to 0 here, since there was no
    // rate input at all) -- compute it from qty * rate, inflated by
    // wastage%, so product pricing derived from this BOM is meaningful.
    const grossCost = row.quantity * row.currentRate;
    const currentCost =
      grossCost + (grossCost * row.wastagePercent) / 100;

    const res = await fetch(
      `/api/vendor-products/${draftId}/bom`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          materialId: row.materialId,
          quantity: row.quantity,
          unit: row.unit,
          wastagePercent:
            row.wastagePercent,
          currentRate: row.currentRate,
          currentCost,
          materialType: row.materialType,
          remarks: "",
          businessId,
          createdBy: userId,
        }),
      }
    );

    // Was never checked -- a failed save (e.g. material not found, no
    // active business) silently did nothing while fetchBOM() below just
    // re-rendered whatever was already saved, so the row LOOKED like it
    // never got added with no error shown anywhere. This is exactly what
    // "I added something but nothing showed up" describes.
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      setRowErrors((prev) => ({
        ...prev,
        [index]: data.message || "Failed to save this material — please try again.",
      }));
      return;
    }

    setSavedFlash(index);
    setTimeout(() => setSavedFlash((cur) => (cur === index ? null : cur)), 2000);

    await fetchBOM();
  };

  /* ================= DELETE ================= */

  const deleteRow = async (id: string) => {
    await fetch(
      `/api/vendor-products/${draftId}/bom?bomId=${id}`,
      {
        method: "DELETE",
      }
    );

    await fetchBOM();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">
        Bill Of Materials
      </h2>
      <p className="text-sm text-gray-500 -mt-4">
        Add every material that goes into this product, its quantity, and
        its rate — the rate you enter here is what drives this product's
        computed cost and suggested selling price below.
      </p>

      {!businessId && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          No active business selected — BOM rows will not save correctly
          until a business is selected.
        </div>
      )}

      {rows.length > 0 && (
        <div className="hidden sm:grid grid-cols-7 gap-2 px-1 text-xs font-medium text-gray-500">
          <span>Material</span>
          <span>Type</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Wastage %</span>
          <span>Rate (₹/unit)</span>
          <span>Actions</span>
        </div>
      )}

      {rows.map((row, index) => (
        <BOMRow
          key={row.bomId || index}
          row={row}
          index={index}
          updateRow={updateRow}
          saveRow={(r) => saveRow(r, index)}
          deleteRow={deleteRow}
          error={rowErrors[index]}
          justSaved={savedFlash === index}
        />
      ))}

      <button
        onClick={addRow}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        + Add Material
      </button>

      <CostSummary
        totalMaterialCost={
          costSummary.totalMaterialCost
        }
        wastageCost={
          costSummary.wastageCost
        }
        finalCost={costSummary.finalCost}
      />

      <PricingPreview
        sellingPrice={pricing.sellingPrice}
        marginAmount={pricing.marginAmount}
        marginPercent={pricing.marginPercent}
      />

      <div className="flex justify-between">
        <button
          onClick={back}
          className="rounded border px-4 py-2"
        >
          Back
        </button>

        <button
          onClick={next}
          disabled={rows.length === 0}
          title={rows.length === 0 ? "Add at least one material first" : undefined}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
