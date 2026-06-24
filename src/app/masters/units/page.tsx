"use client";

import { useEffect, useState } from "react";

export default function UnitsPage() {
  const [units, setUnits] = useState([]);

  async function loadData() {
    const res = await fetch(
      "/api/masters/units"
    );

    const data = await res.json();

    if (data.success) {
      setUnits(data.data);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Units
      </h1>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="p-4 text-left">
                Code
              </th>
              <th className="p-4 text-left">
                Name
              </th>
              <th className="p-4 text-left">
                Type
              </th>
            </tr>
          </thead>

          <tbody>
            {units.map((u: any) => (
              <tr
                key={u._id}
                className="border-b border-zinc-900"
              >
                <td className="p-4">
                  {u.unitCode}
                </td>

                <td className="p-4">
                  {u.unitName}
                </td>

                <td className="p-4">
                  {u.unitType}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
