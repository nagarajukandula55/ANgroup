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

  // Auto-generate the slug from the product name until the vendor
  // deliberately edits it themselves — once touched, stop overwriting it.
  // Variant name is chosen in the next step (Structure, since it depends on
  // pack size/unit); the slug here is a starting point, editable later in
  // Review if the vendor wants it to include the variant too.
  useEffect(() => {
    if (slugTouched) return;
    setForm((prev) => ({
      ...prev,
      slug: suggestSlug(prev.productName, ""),
    }));
  }, [form.productName, slugTouched]);

  const handleSave = async () => {
    if (!form.productName.trim()) {
      setError("Product name is required");
      return;
    }
    // Category is required at approval time (Product.categoryId is a
    // required field) -- checked here too so a vendor finds out on step 1,
    // not after finishing all 8 steps and submitting.
    if (!form.categoryId) {
      setError("Category is required — a Super Admin must add one first if none appear above");
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
        <label className={labelClass}>
          Product Name * <span className="text-gray-400 font-normal">(the generic name buyers search for)</span>
        </label>
        <input
          className={inputClass}
          placeholder="e.g. Amul Butter"
          value={form.productName}
          onChange={(e) => setForm({ ...form, productName: e.target.value })}
        />
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        The specific variant (pack size, e.g. "500 g") is chosen in the next
        step, Structure — it&apos;s auto-generated from the unit and pack
        size you set there.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Category *</label>
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
          {categories.length === 0 ? (
            <p className="text-xs text-amber-600">
              No categories exist yet for this business — ask your Super
              Admin to add one (Admin &gt; Products &gt; Product Categories),
              then refresh this page.
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Categories are managed by your Super Admin, not vendors —
              contact them if you need a new one added.
            </p>
          )}
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
          {brands.length === 0 ? (
            <p className="text-xs text-amber-600">
              No brands exist yet for this business — ask your Super Admin
              to add one (Admin &gt; Products &gt; Brands), then refresh
              this page.
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Brands are managed by your Super Admin — contact them if you
              need a new one added.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>
          Description <span className="text-gray-400 font-normal">(shown on the product page — what makes it worth buying?)</span>
        </label>
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
