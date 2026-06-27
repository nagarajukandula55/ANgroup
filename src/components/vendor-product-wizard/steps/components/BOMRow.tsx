"use client";

import MaterialSearchSelect from "@/components/shared/MaterialSearchSelect";

interface BOMRowData {
  bomId?: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  wastagePercent: number;
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
        value={row.quantity}
        onChange={(e) =>
          updateRow(index, "quantity", Number(e.target.value))
        }
      />

      <input
        className="border rounded p-2"
        value={row.unit}
        onChange={(e) =>
          updateRow(index, "unit", e.target.value)
        }
      />

      <input
        type="number"
        className="border rounded p-2"
        value={row.wastagePercent}
        onChange={(e) =>
          updateRow(
            index,
            "wastagePercent",
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
