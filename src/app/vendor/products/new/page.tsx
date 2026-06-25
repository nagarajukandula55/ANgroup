"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  _id: string;
  categoryName?: string;
  brandName?: string;
};

export default function NewVendorProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<any>({
    productName: "",
    variantName: "",
    categoryId: "",
    brandId: "",
    description: "",

    vendorSku: "",
    vendorCost: 0,
    mrp: 0,
    suggestedSellingPrice: 0,

    unit: "",
    packSize: 1,
    netWeight: 0,
    grossWeight: 0,

    hsnCode: "",
    gstRate: 0,

    minimumOrderQty: 1,
    leadTimeDays: 0,
    availableStock: 0,
  });

  useEffect(() => {
    fetch("/api/product-categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data || []));

    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.data || []));
  }, []);

  function updateField(key: string, value: any) {
    setForm((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit() {
    try {
      setLoading(true);

      const payload = {
        ...form,

        businessId: "", // later from auth
        vendorId: "", // later from auth
        createdBy: "", // later from auth

        approvalStatus: "DRAFT",
        active: true,
      };

      const res = await fetch(
        "/api/vendor-products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (data.success) {
        router.push("/vendor/products");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          New Vendor Product
        </h1>
        <p className="text-sm text-gray-500">
          Upload your product for approval
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* PRODUCT NAME */}
        <input
          placeholder="Product Name"
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "productName",
              e.target.value
            )
          }
        />

        {/* VARIANT */}
        <input
          placeholder="Variant Name"
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "variantName",
              e.target.value
            )
          }
        />

        {/* CATEGORY */}
        <select
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "categoryId",
              e.target.value
            )
          }
        >
          <option value="">
            Select Category
          </option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.categoryName}
            </option>
          ))}
        </select>

        {/* BRAND */}
        <select
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "brandId",
              e.target.value
            )
          }
        >
          <option value="">
            Select Brand
          </option>
          {brands.map((b) => (
            <option key={b._id} value={b._id}>
              {b.brandName}
            </option>
          ))}
        </select>

        {/* SKU */}
        <input
          placeholder="Vendor SKU"
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "vendorSku",
              e.target.value
            )
          }
        />

        {/* COST */}
        <input
          type="number"
          placeholder="Vendor Cost"
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "vendorCost",
              Number(e.target.value)
            )
          }
        />

        {/* MRP */}
        <input
          type="number"
          placeholder="MRP"
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "mrp",
              Number(e.target.value)
            )
          }
        />

        {/* MOQ */}
        <input
          type="number"
          placeholder="Minimum Order Qty"
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "minimumOrderQty",
              Number(e.target.value)
            )
          }
        />

        {/* LEAD TIME */}
        <input
          type="number"
          placeholder="Lead Time (Days)"
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "leadTimeDays",
              Number(e.target.value)
            )
          }
        />

        {/* STOCK */}
        <input
          type="number"
          placeholder="Available Stock"
          className="border p-2 rounded"
          onChange={(e) =>
            updateField(
              "availableStock",
              Number(e.target.value)
            )
          }
        />
      </div>

      {/* DESCRIPTION */}
      <textarea
        placeholder="Description"
        className="border p-2 rounded w-full"
        rows={4}
        onChange={(e) =>
          updateField(
            "description",
            e.target.value
          )
        }
      />

      {/* SUBMIT */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-black text-white px-6 py-2 rounded"
      >
        {loading
          ? "Submitting..."
          : "Submit Product"}
      </button>
    </div>
  );
}
