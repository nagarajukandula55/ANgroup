"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Check } from "lucide-react";

export interface TreeSelectItem {
  _id: string;
  name: string;
  parentId?: string | null;
}

/**
 * A dropdown that actually renders as a collapsible/expandable tree
 * (native <select> can only show a flat indented list) -- per explicit
 * direction ("dropdown tree structure is still yet to implement in system
 * wise"). Click the item label to select it; click the chevron to
 * expand/collapse its children without selecting.
 */
export function TreeSelect({
  items,
  value,
  onChange,
  placeholder = "Select…",
  className,
}: {
  items: TreeSelectItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const byParent = new Map<string, TreeSelectItem[]>();
  const ids = new Set(items.map((i) => i._id));
  for (const item of items) {
    const key = item.parentId && ids.has(item.parentId) ? item.parentId : "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(item);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  const selected = items.find((i) => i._id === value);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(item: TreeSelectItem, depth: number) {
    const children = byParent.get(item._id) || [];
    const isOpen = expanded.has(item._id);
    return (
      <div key={item._id}>
        <div
          className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer"
          style={{ paddingLeft: `${8 + depth * 18}px` }}
          onClick={() => {
            onChange(item._id);
            setOpen(false);
          }}
        >
          {children.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(item._id);
              }}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="text-sm text-gray-800 flex-1">{item.name}</span>
          {value === item._id && <Check className="w-3.5 h-3.5 text-gray-900 shrink-0" />}
        </div>
        {isOpen && children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

  const roots = byParent.get("__root__") || [];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={className || "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-left text-gray-900 outline-none focus:border-gray-400"}
      >
        {selected ? selected.name : <span className="text-gray-400">{placeholder}</span>}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 px-1">
          {roots.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-2">No options</p>
          ) : (
            roots.map((r) => renderNode(r, 0))
          )}
        </div>
      )}
    </div>
  );
}
