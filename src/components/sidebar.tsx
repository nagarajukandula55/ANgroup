"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [modules, setModules] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadSidebar();
  }, []);

  async function loadSidebar() {
    const userId = "demo-user";
    const businessId = localStorage.getItem("businessId");

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

    if (data.success) setModules(data.modules);
  }

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-xl lg:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:relative z-50 h-screen w-80 transform border-r border-white/10 bg-white/[0.03] backdrop-blur-3xl transition-transform duration-300 ${
          open
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col px-6 py-8">
          <div className="mb-10">
            <p className="text-[11px] uppercase tracking-[0.45em] text-cyan-300/80">
              Enterprise Core
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              AN Group OS
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Unified business intelligence
            </p>
          </div>

          <nav className="space-y-2">
            {modules.map((m) => {
              const active = pathname === m.route;

              return (
                <Link
                  key={m.key}
                  href={m.route}
                  onClick={() => setOpen(false)}
                  className={`group flex items-center justify-between rounded-2xl px-4 py-4 transition-all ${
                    active
                      ? "bg-cyan-500/10 text-cyan-300 border border-cyan-400/20"
                      : "text-slate-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <span>{m.label}</span>

                  <ChevronRight
                    size={16}
                    className="opacity-0 group-hover:opacity-100 transition"
                  />
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
              System Status
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-slate-300">
                Operational
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
