"use client";

import { useEffect, useState } from "react";
import {
  suggestSeoTitle,
  suggestSeoDescription,
  suggestSeoKeywords,
} from "@/lib/slugify";

interface StepReviewProps {
  draftId: string;
  next: () => void;
  back: () => void;
}

interface ProductSnapshot {
  productName?: string;
  variantName?: string;
  description?: string;
  slug?: string;
  images?: string[];
  categoryId?: { name?: string } | string;
  brandId?: { name?: string } | string;
  vendorSku?: string;
  vendorCost?: number;
  unit?: string;
  packSize?: number;
  hsnCode?: string;
  gstRate?: number;
  seo?: { customTitle?: string; customDescription?: string; keywords?: string[] };
}

export default function StepReview({
  draftId,
  next,
  back,
}: StepReviewProps) {
  const [product, setProduct] = useState<ProductSnapshot | null>(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/vendor-products/${draftId}`);
        const data = await res.json();
        if (data.success && data.data) {
          const p: ProductSnapshot = data.data;
          setProduct(p);
          setImages(p.images || []);

          const categoryName =
            typeof p.categoryId === "object" ? p.categoryId?.name : undefined;
          const brandName =
            typeof p.brandId === "object" ? p.brandId?.name : undefined;

          setSeoTitle(
            p.seo?.customTitle ||
              suggestSeoTitle(p.productName, p.variantName, brandName)
          );
          setSeoDescription(
            p.seo?.customDescription ||
              suggestSeoDescription(p.description, p.productName)
          );
          setSeoKeywords(
            (p.seo?.keywords?.length
              ? p.seo.keywords
              : suggestSeoKeywords(p.productName, categoryName, brandName)
            ).join(", ")
          );
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [draftId]);

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Image upload failed");
      }
      const url = data.asset?.fileUrl;
      if (url) setImages((prev) => [...prev, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError(null);
    try {
      setSaving(true);
      const res = await fetch(`/api/vendor-products/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          seo: {
            customTitle: seoTitle,
            customDescription: seoDescription,
            keywords: seoKeywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
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
      setSaving(false);
    }
  }

  const inputClass = "w-full border rounded p-2";
  const labelClass = "text-xs font-medium text-gray-500";

  if (loading) {
    return <p className="text-sm text-gray-500">Loading product summary…</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Review, Images & SEO</h2>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="rounded-lg border bg-gray-50 p-4 text-sm space-y-1">
        <p><span className="text-gray-500">Product:</span> {product?.productName} {product?.variantName ? `— ${product.variantName}` : ""}</p>
        <p><span className="text-gray-500">Slug:</span> <span className="font-mono">{product?.slug || "—"}</span></p>
        <p><span className="text-gray-500">Vendor SKU:</span> {product?.vendorSku || "—"}</p>
        <p><span className="text-gray-500">Unit / Pack:</span> {product?.unit || "—"} × {product?.packSize ?? "—"}</p>
        <p><span className="text-gray-500">HSN / GST:</span> {product?.hsnCode || "—"} / {product?.gstRate ?? 0}%</p>
      </div>

      {/* Images */}
      <div>
        <label className={labelClass}>Product Images</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={i} className="relative h-20 w-20 overflow-hidden rounded border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}

          <label className={`flex h-20 w-20 cursor-pointer items-center justify-center rounded border-2 border-dashed text-xs text-gray-400 ${uploading ? "opacity-50" : "hover:border-gray-400"}`}>
            {uploading ? "…" : "+ Add"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* SEO */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">
          SEO{" "}
          <span className="font-normal text-gray-400">
            (suggested automatically — edit if needed)
          </span>
        </h3>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>SEO Title</label>
          <input
            className={inputClass}
            value={seoTitle}
            maxLength={70}
            onChange={(e) => setSeoTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>SEO Description</label>
          <textarea
            className={inputClass}
            rows={2}
            maxLength={160}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClass}>Keywords (comma-separated)</label>
          <input
            className={inputClass}
            value={seoKeywords}
            onChange={(e) => setSeoKeywords(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={back} className="rounded border px-4 py-2">
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Continue to Submit"}
        </button>
      </div>
    </div>
  );
}
