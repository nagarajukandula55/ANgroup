"use client";

import { useState } from "react";

export default function StepCommercial({ draftId, next, back }) {
  const [form, setForm] = useState({
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
    setLoading(true);

    await fetch(`/api/vendor-products/${draftId}/commercial`, {
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
        Commercial Details
      </h2>

      <input
        className="w-full border p-2 rounded"
        placeholder="Vendor SKU"
        value={form.vendorSku}
        onChange={(e) =>
          setForm({ ...form, vendorSku: e.target.value })
        }
      />

      <input
        type="number"
        className="w-full border p-2 rounded"
        placeholder="Vendor Cost"
        value={form.vendorCost}
        onChange={(e) =>
          setForm({ ...form, vendorCost: Number(e.target.value) })
        }
      />

      <input
        type="number"
        className="w-full border p-2 rounded"
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
        className="w-full border p-2 rounded"
        value={form.shippingCostType}
        onChange={(e) =>
          setForm({
            ...form,
            shippingCostType: e.target.value,
          })
        }
      >
        <option value="SEPARATE">Separate</option>
        <option value="INCLUDED">Included</option>
      </select>

      <input
        type="number"
        className="w-full border p-2 rounded"
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
        className="w-full border p-2 rounded"
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
        className="w-full border p-2 rounded"
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
          className="px-4 py-2 border rounded"
        >
          Back
        </button>

        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>

      </div>
    </div>
  );
}
