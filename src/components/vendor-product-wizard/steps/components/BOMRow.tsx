"use client";

import MaterialSearchSelect from "@/components/shared/MaterialSearchSelect";

interface BOMRowData {
  bomId?: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  wastagePercent: number;
  currentRate: number;
}

interface Props {
  row: BOMRowData;
  index: number;
  updateRow: (
    index: number,
    field: keyof BOMRowData,
    value: any
  ) => void;
  saveRow: (row: BOMRowData) => void;
  deleteRow: (id: string) => void;
}

export default function BOMRow({
  row,
  index,
  updateRow,
  saveRow,
  deleteRow,
}: Props) {
  return (
    <div className="grid grid-cols-6 gap-2 border rounded p-3">

      <MaterialSearchSelect
        onSelect={(m: any) => {
          updateRow(index, "materialId", m._id);
          updateRow(index, "materialName", m.materialName);
          updateRow(index, "unit", m.unit);
        }}
      />

      <input
        type="number"
        className="border rounded p-2"
        placeholder="Qty"
        title="Quantity of this material required"
        value={row.quantity}
        onFocus={(e) => e.target.select()}
        onChange={(e) =>
          updateRow(index, "quantity", Number(e.target.value))
        }
      />

      <input
        className="border rounded p-2"
        placeholder="Unit"
        title="Unit of measurement (e.g. kg, pcs)"
        value={row.unit}
        onChange={(e) =>
          updateRow(index, "unit", e.target.value)
        }
      />

      <input
        type="number"
        className="border rounded p-2"
        placeholder="Wastage %"
        title="Wastage percentage for this material"
        value={row.wastagePercent}
        onFocus={(e) => e.target.select()}
        onChange={(e) =>
          updateRow(
            index,
            "wastagePercent",
            Number(e.target.value)
          )
        }
      />

      <input
        type="number"
        className="border rounded p-2"
        placeholder="Rate"
        title="Rate per unit, used to compute BOM cost and drives product pricing"
        value={row.currentRate}
        onFocus={(e) => e.target.select()}
        onChange={(e) =>
          updateRow(
            index,
            "currentRate",
            Number(e.target.value)
          )
        }
      />

      <button
        onClick={() => saveRow(row)}
        className="bg-green-600 text-white rounded px-3"
      >
        Save
      </button>

      {row.bomId && (
        <button
          onClick={() => deleteRow(row.bomId!)}
          className="bg-red-600 text-white rounded px-3"
        >
          Delete
        </button>
      )}

    </div>
  );
}
