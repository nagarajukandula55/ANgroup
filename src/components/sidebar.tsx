"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    loadSidebar();
  }, []);

  async function loadSidebar() {
    const userId = "demo-user"; // replace with auth
    const businessId =
      localStorage.getItem("businessId");

    const res = await fetch("/api/ui/sidebar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        businessId,
      }),
    });

    const data = await res.json();

    if (data.success) {
      setModules(data.modules);
    }
  }

  return (
    <div className="w-72 min-h-screen bg-[#07111f] border-r border-white/10 p-5">
      <h2 className="text-white font-bold text-xl mb-6">
        AN GROUP OS
      </h2>

      <div className="space-y-2">
        {modules.map((m) => {
          const active = pathname === m.route;

          return (
            <Link
              key={m.key}
              href={m.route}
              className={`block px-4 py-3 rounded-xl text-sm ${
                active
                  ? "bg-cyan-500 text-black"
                  : "text-white/70 hover:bg-white/5"
              }`}
            >
              {m.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
