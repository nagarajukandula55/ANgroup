"use client";

import { useEffect, useState } from "react";

interface Material {
  _id: string;
  materialName: string;
  materialCode: string;
  unit: string;
}

interface MaterialSearchSelectProps {
  value?: Material | null;
  onChange?: (material: Material | null) => void;
  onSelect?: (material: Material) => void;
}

export default function MaterialSearchSelect({
  value,
  onChange,
  onSelect,
}: MaterialSearchSelectProps) {
  const [query, setQuery] = useState(
    value?.materialName || ""
  );

  const [items, setItems] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setQuery(value?.materialName || "");
  }, [value]);

  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      setOpen(false);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/materials/search?q=${encodeURIComponent(query)}`
        );

        const data = await res.json();

        if (data.success) {
          setItems(data.data);
          setSearched(true);
          setOpen(true);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const selectMaterial = (material: Material) => {
    setQuery(material.materialName);
    setOpen(false);

    onSelect?.(material);
    onChange?.(material);
  };

  return (
    <div className="relative w-full">
      <input
        className="border p-2 rounded w-full"
        placeholder="Search material..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />

      {open && items.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-auto rounded border bg-white shadow-lg z-50">
          {items.map((m) => (
            <div
              key={m._id}
              className="cursor-pointer p-2 hover:bg-gray-100"
              onClick={() => selectMaterial(m)}
            >
              <div className="font-medium">
                {m.materialName}
              </div>

              <div className="text-xs text-gray-500">
                {m.materialCode} | {m.unit}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Was silently rendering nothing on zero results -- a vendor typing a
          real material name with no matches saw no feedback at all, looking
          exactly like the search was broken rather than "no data exists
          yet." Materials are added by a Super Admin (Admin > Materials),
          not vendors, so this tells them what to actually do about it. */}
      {open && searched && items.length === 0 && (
        <div className="absolute left-0 right-0 mt-1 rounded border bg-white shadow-lg z-50 p-3">
          <p className="text-sm text-gray-500">No materials found for &quot;{query}&quot;</p>
          <p className="text-xs text-amber-600 mt-1">
            Materials are added by your Super Admin (Admin &gt; Materials) —
            ask them to add it, then search again.
          </p>
        </div>
      )}
    </div>
  );
}
