"use client";

import { useEffect, useState } from "react";

export default function BOMView({
  params,
}: any) {
  const [bom, setBom] =
    useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch(
      `/api/bom/${params.id}`
    );

    const json =
      await res.json();

    setBom(json.data);
  }

  if (!bom) {
    return (
      <div className="p-6">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6">

      <h1 className="mb-6 text-2xl font-bold">
        BOM Details
      </h1>

      <div className="mb-6">
        <p>
          Variant:
          {" "}
          {
            bom.productVariantId
              ?.variantName
          }
        </p>

        <p>
          Version:
          {" "}
          {bom.versionNumber}
        </p>

        <p>
          Batch Size:
          {" "}
          {bom.batchSize}
        </p>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th className="p-2">
              Material
            </th>

            <th className="p-2">
              Qty
            </th>

            <th className="p-2">
              Unit
            </th>
          </tr>
        </thead>

        <tbody>
          {bom.items.map(
            (
              item: any,
              idx: number
            ) => (
              <tr key={idx}>
                <td className="p-2">
                  {
                    item.materialId
                      ?.materialName
                  }
                </td>

                <td className="p-2">
                  {
                    item.quantity
                  }
                </td>

                <td className="p-2">
                  {item.unit}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>

    </div>
  );
}
