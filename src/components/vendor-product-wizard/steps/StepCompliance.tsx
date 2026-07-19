"use client";

import { useEffect, useState } from "react";

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

interface BomIngredient {
  materialName: string;
  quantity: number;
  unit: string;
  percent: number;
}

// Common allergen keywords -> the label to warn on -- a heuristic first
// pass matched against ingredient/material NAMES, not a certified allergen
// database. Always surfaced as a suggestion for the vendor to confirm or
// remove below, never saved silently.
const ALLERGEN_KEYWORDS: [RegExp, string][] = [
  [/milk|dairy|butter|ghee|paneer|curd|yog(h)?urt|cream|cheese/i, "Milk"],
  [/wheat|maida|atta|gluten|semolina|suji/i, "Gluten"],
  [/peanut|groundnut/i, "Peanuts"],
  [/cashew|almond|walnut|pistachio|nuts?\b/i, "Tree nuts"],
  [/soy(a)?/i, "Soy"],
  [/egg/i, "Egg"],
  [/mustard/i, "Mustard"],
  [/sesame|til\b/i, "Sesame"],
];

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
  const [bomIngredients, setBomIngredients] = useState<BomIngredient[]>([]);
  const [allergenSuggestions, setAllergenSuggestions] = useState<string[]>([]);

  // Was never fetched -- resuming an existing draft reset this whole step
  // back to blank even if it was already filled in and saved.
  useEffect(() => {
    fetch(`/api/vendor-products/${draftId}`)
      .then((r) => r.json())
      .then((d) => {
        const c = d?.data?.compliance;
        const n = d?.data?.nutrition;
        if (!c && !n) return;
        setForm({
          ingredients: (c?.ingredients || []).join(", "),
          allergens: (c?.allergens || []).join(", "),
          warnings: (c?.warnings || []).join(", "),
          usageInstructions: c?.usageInstructions || "",
          servingSize: n?.servingSize || 0,
          energy: n?.energy || 0,
          protein: n?.protein || 0,
          carbs: n?.carbs || 0,
          sugars: n?.sugars || 0,
          fat: n?.fat || 0,
          sodium: n?.sodium || 0,
        });
      })
      .catch(() => {});
  }, [draftId]);

  // Suggest ingredients + their composition % from the BOM's INGREDIENT-
  // classified rows (packaging/other rows excluded via materialType, set
  // in the BOM step) -- percent is quantity-share within the ingredient
  // rows, which only means something if those quantities share a common
  // unit (typical for a single recipe); shown as a rough composition
  // breakdown for the vendor to sanity-check, not a certified figure.
  // Also suggests allergen warnings from ingredient names against a
  // common-keyword list -- always just a suggestion, never saved
  // automatically.
  useEffect(() => {
    fetch(`/api/vendor-products/${draftId}/bom`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success || !Array.isArray(d.data) || !d.data.length) return;
        const ingredientRows = d.data.filter((item: any) => (item.materialType || "INGREDIENT") === "INGREDIENT");
        const totalQty = ingredientRows.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        const breakdown: BomIngredient[] = ingredientRows.map((item: any) => ({
          materialName: item.materialName || "",
          quantity: item.quantity || 0,
          unit: item.unit || "",
          percent: totalQty > 0 ? ((item.quantity || 0) / totalQty) * 100 : 0,
        }));
        setBomIngredients(breakdown);

        if (!form.ingredients && breakdown.length) {
          setForm((prev) => ({ ...prev, ingredients: breakdown.map((b) => b.materialName).filter(Boolean).join(", ") }));
        }

        const matched = new Set<string>();
        for (const { materialName } of breakdown) {
          for (const [re, label] of ALLERGEN_KEYWORDS) {
            if (re.test(materialName)) matched.add(label);
          }
        }
        setAllergenSuggestions(Array.from(matched));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  function applyAllergenSuggestions() {
    const current = toList(form.allergens);
    const merged = Array.from(new Set([...current, ...allergenSuggestions]));
    setForm((prev) => ({ ...prev, allergens: merged.join(", ") }));
  }

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
        <label className={labelClass}>
          Ingredients (comma-separated){" "}
          <span className="text-gray-400 font-normal">
            (suggested from your BOM's Ingredient-classified materials — review and edit before continuing)
          </span>
        </label>
        <textarea
          className={inputClass}
          rows={2}
          placeholder="Wheat flour, Sugar, Vegetable oil, Salt"
          value={form.ingredients}
          onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
        />
      </div>

      {bomIngredients.length > 0 && (
        <div className="rounded border bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            Composition breakdown (from BOM quantities)
          </p>
          <div className="space-y-1">
            {bomIngredients
              .slice()
              .sort((a, b) => b.percent - a.percent)
              .map((b) => (
                <div key={b.materialName} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-gray-700">{b.materialName}</span>
                  <span className="w-32 h-2 rounded bg-gray-200 overflow-hidden">
                    <span className="block h-full bg-blue-500" style={{ width: `${Math.min(100, b.percent)}%` }} />
                  </span>
                  <span className="w-14 text-right font-mono text-xs text-gray-500">{b.percent.toFixed(1)}%</span>
                </div>
              ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Approximate — only accurate if your BOM quantities share a common unit.
          </p>
        </div>
      )}

      {allergenSuggestions.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm flex items-center justify-between gap-3">
          <p className="text-amber-800">
            Possible allergens detected from ingredient names: <strong>{allergenSuggestions.join(", ")}</strong>
          </p>
          <button
            type="button"
            onClick={applyAllergenSuggestions}
            className="shrink-0 rounded border border-amber-400 bg-white px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
          >
            Add to Allergens
          </button>
        </div>
      )}

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
              onFocus={(e) => e.target.select()}
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
