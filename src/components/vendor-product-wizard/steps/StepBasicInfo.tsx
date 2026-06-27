"use client";

import { useState } from "react";

interface StepBasicInfoProps {
  draftId: string;
  next: () => void;
}

interface BasicInfoForm {
  productName: string;
  variantName: string;
  description: string;
}

export default function StepBasicInfo({
  draftId,
  next,
}: StepBasicInfoProps) {
  const [form, setForm] = useState<BasicInfoForm>({
    productName: "",
    variantName: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);

      await fetch(`/api/vendor-products/${draftId}/basic`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      next();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Basic Product Information
      </h2>

      <input
        className="w-full border rounded p-2"
        placeholder="Product Name"
        value={form.productName}
        onChange={(e) =>
          setForm({
            ...form,
            productName: e.target.value,
          })
        }
      />

      <input
        className="w-full border rounded p-2"
        placeholder="Variant Name"
        value={form.variantName}
        onChange={(e) =>
          setForm({
            ...form,
            variantName: e.target.value,
          })
        }
      />

      <textarea
        className="w-full border rounded p-2"
        rows={5}
        placeholder="Description"
        value={form.description}
        onChange={(e) =>
          setForm({
            ...form,
            description: e.target.value,
          })
        }
      />

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
