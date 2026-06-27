"use client";

import { useState } from "react";

interface StepCommercialProps {
  draftId: string;
  next: () => void;
  back: () => void;
}

interface CommercialForm {
  vendorSku: string;
  vendorCost: number;
  vendorShippingCost: number;
  shippingCostType: "SEPARATE" | "INCLUDED";
  minimumOrderQty: number;
  leadTimeDays: number;
  availableStock: number;
}

export default function StepCommercial({
  draftId,
  next,
  back,
}: StepCommercialProps) {
  const [form, setForm] = useState<CommercialForm>({
    vendorSku: "",
    vendorCost: 0,
    vendorShippingCost: 0,
    shippingCostType: "SEPARATE",
    minimumOrderQty: 1,
    leadTimeDays: 0,
    availableStock: 0,
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);

      await fetch(`/api/vendor-products/${draftId}/commercial`, {
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
        Commercial Details
      </h2>

      <input
        className="w-full border rounded p-2"
        placeholder="Vendor SKU"
        value={form.vendorSku}
        onChange={(e) =>
          setForm({
            ...form,
            vendorSku: e.target.value,
          })
        }
      />

      <input
        type="number"
        className="w-full border rounded p-2"
        placeholder="Vendor Cost"
        value={form.vendorCost}
        onChange={(e) =>
          setForm({
            ...form,
            vendorCost: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className="w-full border rounded p-2"
        placeholder="Shipping Cost"
        value={form.vendorShippingCost}
        onChange={(e) =>
          setForm({
            ...form,
            vendorShippingCost: Number(e.target.value),
          })
        }
      />

      <select
        className="w-full border rounded p-2"
        value={form.shippingCostType}
        onChange={(e) =>
          setForm({
            ...form,
            shippingCostType: e.target
              .value as CommercialForm["shippingCostType"],
          })
        }
      >
        <option value="SEPARATE">Separate</option>
        <option value="INCLUDED">Included</option>
      </select>

      <input
        type="number"
        className="w-full border rounded p-2"
        placeholder="Minimum Order Qty"
        value={form.minimumOrderQty}
        onChange={(e) =>
          setForm({
            ...form,
            minimumOrderQty: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className="w-full border rounded p-2"
        placeholder="Lead Time (Days)"
        value={form.leadTimeDays}
        onChange={(e) =>
          setForm({
            ...form,
            leadTimeDays: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className="w-full border rounded p-2"
        placeholder="Available Stock"
        value={form.availableStock}
        onChange={(e) =>
          setForm({
            ...form,
            availableStock: Number(e.target.value),
          })
        }
      />

      <div className="flex justify-between pt-4">
        <button
          onClick={back}
          className="rounded border px-4 py-2"
        >
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
