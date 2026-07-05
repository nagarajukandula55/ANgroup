"use client";

import { useEffect, useState } from "react";
import { suggestSlug } from "@/lib/slugify";

interface StepBasicInfoProps {
  draftId: string;
  businessId?: string;
  next: () => void;
}

interface BasicInfoForm {
  productName: string;
  variantName: string;
  description: string;
  slug: string;
  categoryId: string;
  brandId: string;
}

interface Option {
  _id: string;
  name: string;
}

export default function StepBasicInfo({
  draftId,
  businessId,
  next,
}: StepBasicInfoProps) {
  const [form, setForm] = useState<BasicInfoForm>({
    productName: "",
    variantName: "",
    description: "",
    slug: "",
    categoryId: "",
    brandId: "",
  });

  const [slugTouched, setSlugTouched] = useState(false);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    fetch(`/api/product-categories?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => d.success && setCategories(d.categories || []))
      .catch(() => {});
    fetch(`/api/brands?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => d.success && setBrands(d.brands || []))
      .catch(() => {});
  }, [businessId]);

  // Auto-generate the slug from product + variant name until the vendor
  // deliberately edits it themselves — once touched, stop overwriting it.
  useEffect(() => {
    if (slugTouched) return;
    setForm((prev) => ({
      ...prev,
      slug: suggestSlug(prev.productName, prev.variantName),
    }));
  }, [form.productName, form.variantName, slugTouched]);

  const handleSave = async () => {
    if (!form.productName.trim()) {
      setError("Product name is required");
      return;
    }
    setError(null);

    try {
      setLoading(true);

      const res = await fetch(`/api/vendor-products/${draftId}/basic`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      <h2 className="text-xl font-semibold">Basic Product Information</h2>
      <p className="text-sm text-gray-500">
        Start with the essentials — the URL slug and SEO fields will be
        suggested automatically as you type, and you can fine-tune them
        later in the Review step.
      </p>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Product Name *</label>
        <input
          className={inputClass}
          placeholder="e.g. Amul Butter"
          value={form.productName}
          onChange={(e) => setForm({ ...form, productName: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Variant Name</label>
        <input
          className={inputClass}
          placeholder="e.g. 500g Pouch"
          value={form.variantName}
          onChange={(e) => setForm({ ...form, variantName: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Category</label>
          <select
            className={inputClass}
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Brand</label>
          <select
            className={inputClass}
            value={form.brandId}
            onChange={(e) => setForm({ ...form, brandId: e.target.value })}
          >
            <option value="">Select brand…</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Description</label>
        <textarea
          className={inputClass}
          rows={5}
          placeholder="Describe the product for buyers…"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>
          URL Slug{" "}
          <span className="text-gray-400 font-normal">
            (auto-generated — edit if needed)
          </span>
        </label>
        <input
          className={`${inputClass} font-mono text-sm`}
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setForm({ ...form, slug: e.target.value });
          }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save & Continue"}
      </button>
    </div>
  );
}
