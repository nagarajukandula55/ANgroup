"use client";

import { useState } from "react";

export default function StepBasicInfo({ draftId, next }) {
  const [form, setForm] = useState({
    productName: "",
    variantName: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    await fetch(`/api/vendor-products/${draftId}/basic`, {
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
        Basic Product Information
      </h2>

      <input
        className="w-full border p-2 rounded"
        placeholder="Product Name"
        value={form.productName}
        onChange={(e) =>
          setForm({ ...form, productName: e.target.value })
        }
      />

      <input
        className="w-full border p-2 rounded"
        placeholder="Variant Name"
        value={form.variantName}
        onChange={(e) =>
          setForm({ ...form, variantName: e.target.value })
        }
      />

      <textarea
        className="w-full border p-2 rounded"
        placeholder="Description"
        value={form.description}
        onChange={(e) =>
          setForm({ ...form, description: e.target.value })
        }
      />

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Saving..." : "Save & Continue"}
      </button>

    </div>
  );
}
