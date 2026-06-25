"use client";

import { useEffect, useState } from "react";

type VendorProduct = {
  _id: string;
  productName: string;
  variantName: string;
  vendorCost: number;
  mrp: number;
  approvalStatus: string;
};

export default function VendorProductsPage() {
  const [products, setProducts] =
    useState<VendorProduct[]>([]);

  const [loading, setLoading] =
    useState(true);

  async function loadProducts() {
    try {
      const res = await fetch(
        "/api/vendor-products"
      );

      const data = await res.json();

      setProducts(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Vendor Products
          </h1>

          <p className="text-sm text-gray-500">
            Manage submitted products
          </p>
        </div>

        <a
          href="/vendor/products/new"
          className="rounded-lg bg-black px-4 py-2 text-white"
        >
          New Product
        </a>
      </div>

      {/* TABLE */}

      <div className="overflow-auto rounded-xl border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 text-left">
                Product
              </th>

              <th className="p-3 text-left">
                Variant
              </th>

              <th className="p-3 text-right">
                Cost
              </th>

              <th className="p-3 text-right">
                MRP
              </th>

              <th className="p-3 text-center">
                Status
              </th>

              <th className="p-3 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center"
                >
                  Loading...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center"
                >
                  No Products Found
                </td>
              </tr>
            ) : (
              products.map((item) => (
                <tr
                  key={item._id}
                  className="border-b"
                >
                  <td className="p-3">
                    {item.productName}
                  </td>

                  <td className="p-3">
                    {item.variantName}
                  </td>

                  <td className="p-3 text-right">
                    ₹{item.vendorCost}
                  </td>

                  <td className="p-3 text-right">
                    ₹{item.mrp}
                  </td>

                  <td className="p-3 text-center">
                    <span className="rounded-md border px-2 py-1 text-xs">
                      {item.approvalStatus}
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <a
                        href={`/vendor/products/${item._id}`}
                        className="rounded border px-2 py-1"
                      >
                        Edit
                      </a>

                      <a
                        href={`/vendor/products/${item._id}/bom`}
                        className="rounded border px-2 py-1"
                      >
                        BOM
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
