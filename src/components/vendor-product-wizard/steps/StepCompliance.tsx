"use client";

import { useState } from "react";

interface StepComplianceProps {
  draftId: string;
  next: () => void;
  back: () => void;
}

interface ComplianceForm {
  ingredients: string; // comma-separated in the UI, split to array on save
  allergens: string;
  warnings: string;
  usageInstructions: string;
  servingSize: number;
  energy: number;
  protein: number;
  carbs: number;
  sugars: number;
  fat: number;
  sodium: number;
}

function toList(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function StepCompliance({
  draftId,
  next,
  back,
}: StepComplianceProps) {
  const [form, setForm] = useState<ComplianceForm>({
    ingredients: "",
    allergens: "",
    warnings: "",
    usageInstructions: "",
    servingSize: 0,
    energy: 0,
    protein: 0,
    carbs: 0,
    sugars: 0,
    fat: 0,
    sodium: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    try {
      setLoading(true);
      const res = await fetch(`/api/vendor-products/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compliance: {
            ingredients: toList(form.ingredients),
            allergens: toList(form.allergens),
            warnings: toList(form.warnings),
            usageInstructions: form.usageInstructions,
          },
          nutrition: {
            servingSize: form.servingSize,
            energy: form.energy,
            protein: form.protein,
            carbs: form.carbs,
            sugars: form.sugars,
            fat: form.fat,
            sodium: form.sodium,
          },
        }),
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
      <h2 className="text-xl font-semibold">Compliance & Nutrition</h2>
      <p className="text-sm text-gray-500">
        Required for food/FMCG products — buyers and regulators rely on
        accurate ingredient and allergen information.
      </p>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Ingredients (comma-separated)</label>
        <textarea
          className={inputClass}
          rows={2}
          placeholder="Wheat flour, Sugar, Vegetable oil, Salt"
          value={form.ingredients}
          onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Allergens (comma-separated)</label>
          <input
            className={inputClass}
            placeholder="Milk, Nuts, Gluten"
            value={form.allergens}
            onChange={(e) => setForm({ ...form, allergens: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Warnings (comma-separated)</label>
          <input
            className={inputClass}
            placeholder="Contains traces of soy"
            value={form.warnings}
            onChange={(e) => setForm({ ...form, warnings: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Usage Instructions</label>
        <textarea
          className={inputClass}
          rows={2}
          value={form.usageInstructions}
          onChange={(e) =>
            setForm({ ...form, usageInstructions: e.target.value })
          }
        />
      </div>

      <h3 className="text-sm font-semibold text-gray-700 pt-2">
        Nutrition (per serving)
      </h3>

      <div className="grid grid-cols-3 gap-4">
        {(
          [
            ["servingSize", "Serving Size (g)"],
            ["energy", "Energy (kcal)"],
            ["protein", "Protein (g)"],
            ["carbs", "Carbs (g)"],
            ["sugars", "Sugars (g)"],
            ["fat", "Fat (g)"],
            ["sodium", "Sodium (mg)"],
          ] as [keyof ComplianceForm, string][]
        ).map(([key, label]) => (
          <div key={key} className="flex flex-col gap-1">
            <label className={labelClass}>{label}</label>
            <input
              type="number"
              className={inputClass}
              value={form[key] as number}
              onChange={(e) =>
                setForm({ ...form, [key]: Number(e.target.value) })
              }
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={back} className="rounded border px-4 py-2">
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
