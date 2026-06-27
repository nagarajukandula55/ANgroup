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
  next: () => void;
  back: () => void;
}

export default function StepBOM({
  draftId,
  next,
  back,
}: Props) {
  const [rows, setRows] = useState<BOMItem[]>([]);

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

  const saveRow = async (row: BOMItem) => {
    await fetch(
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
          currentRate: 0,
          currentCost: 0,
          remarks: "",
          businessId: "TEMP",
          createdBy: "TEMP",
        }),
      }
    );

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

  /* ================= SUBMIT ================= */

  const submit = async () => {
    await fetch(
      `/api/vendor-products/${draftId}/submit`,
      {
        method: "POST",
      }
    );

    alert("Submitted Successfully");

    next();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">
        Bill Of Materials
      </h2>

      {rows.map((row, index) => (
        <BOMRow
          key={row.bomId || index}
          row={row}
          index={index}
          updateRow={updateRow}
          saveRow={saveRow}
          deleteRow={deleteRow}
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

        <div className="space-x-3">
          <button
            onClick={submit}
            className="rounded bg-purple-600 px-4 py-2 text-white"
          >
            Submit
          </button>

          <button
            onClick={next}
            className="rounded bg-green-600 px-4 py-2 text-white"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
