"use client";

import { useEffect, useState } from "react";

export default function MaterialSearchSelect({ onSelect }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query) return;

    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/materials/search?q=${query}`
      );
      const data = await res.json();

      if (data.success) {
        setItems(data.data);
        setOpen(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">

      <input
        className="border p-2 rounded w-full"
        placeholder="Search material..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {open && items.length > 0 && (
        <div className="absolute bg-white border w-full mt-1 rounded shadow z-10 max-h-60 overflow-auto">

          {items.map((m: any) => (
            <div
              key={m._id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                onSelect(m);
                setQuery(m.materialName);
                setOpen(false);
              }}
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

    </div>
  );
}
