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
  error?: string;
  justSaved?: boolean;
}

export default function BOMRow({
  row,
  index,
  updateRow,
  saveRow,
  deleteRow,
  error,
  justSaved,
}: Props) {
  return (
    <div className="border rounded p-3 space-y-2">
    <div className="grid grid-cols-6 gap-2">

      <MaterialSearchSelect
        value={row.materialId ? { _id: row.materialId, materialName: row.materialName, materialCode: "", unit: row.unit } : null}
        allowVendorCreate
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

      <div className="flex gap-1">
        <button
          onClick={() => saveRow(row)}
          disabled={!row.materialId}
          title={!row.materialId ? "Select a material above first" : undefined}
          className="bg-green-600 text-white rounded px-3 disabled:opacity-40 disabled:cursor-not-allowed"
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

    </div>

    {error && (
      <p className="text-xs text-red-600">{error}</p>
    )}
    {justSaved && !error && (
      <p className="text-xs text-emerald-600">✓ Saved</p>
    )}
    {!row.bomId && !error && !justSaved && row.materialId && (
      <p className="text-xs text-amber-600">Not saved yet — click Save to add this to the BOM.</p>
    )}
    </div>
  );
}
