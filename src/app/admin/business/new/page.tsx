"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const FIELD_LABELS: Record<string, string> = {
  name: "Business Name *",
  legalName: "Legal Name",
  brandName: "Brand Name",
  industry: "Industry",
  type: "Business Type",
  email: "Email",
  phone: "Phone",
  website: "Website",
  gstNumber: "GST Number",
  pan: "PAN",
};

export default function NewBusinessPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    legalName: "",
    brandName: "",
    industry: "",
    type: "",
    email: "",
    phone: "",
    website: "",
    gstNumber: "",
    pan: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: any) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  }

  async function createBusiness() {
    if (!form.name.trim()) {
      setError("Business name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/businesses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        // The business list page lives at /admin/business — there is no
        // standalone /businesses/[id] detail route, so the previous
        // `router.push('/businesses/' + id)` always dead-ended on a 404
        // right after a successful create.
        router.push("/admin/business");
      } else {
        setError(data.message || "Failed to create business");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-10 text-white bg-[#07111f] min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Business</h1>

        <Link
          href="/admin/business"
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          &larr; Back to Businesses
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-6">
        {Object.keys(form).map((key) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-white/50">
              {FIELD_LABELS[key] ?? key}
            </label>
            <input
              name={key}
              value={(form as any)[key]}
              placeholder={FIELD_LABELS[key] ?? key}
              onChange={handleChange}
              className="p-3 bg-black border border-white/20 rounded"
            />
          </div>
        ))}
      </div>

      <button
        onClick={createBusiness}
        disabled={saving}
        className="mt-6 bg-cyan-500 px-6 py-3 text-black font-bold rounded disabled:opacity-50"
      >
        {saving ? "Creating..." : "Create Business"}
      </button>
    </div>
  );
}
