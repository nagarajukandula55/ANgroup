"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Users,
  UserCheck,
  FileSignature,
  Share2,
  Sparkles,
  Plug,
  Shield,
  Bell,
  MessageSquare,
  Building2,
  UserCog,
  Key,
  Store,
  UserPlus,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, Package, ShoppingCart, TrendingUp, DollarSign,
  Users, UserCheck, FileSignature, Share2, Sparkles,
  Plug, Shield, Bell, MessageSquare, Building2, UserCog, Key, Store, UserPlus,
};

// Grouped navigation: each group shown with a subtle header label
const NAV_GROUPS = [
  {
    label: "Core",
    items: [
      { key: "dashboard", label: "Dashboard", route: "/dashboard", icon: "LayoutDashboard" },
      { key: "inventory", label: "Inventory", route: "/inventory", icon: "Package" },
      { key: "purchase", label: "Purchase", route: "/purchase", icon: "ShoppingCart" },
      { key: "sales", label: "Sales", route: "/sales", icon: "TrendingUp" },
      { key: "finance", label: "Finance", route: "/finance", icon: "DollarSign" },
      { key: "crm", label: "CRM", route: "/crm", icon: "Users" },
      { key: "hr", label: "HR", route: "/hr", icon: "UserCheck" },
    ],
  },
  {
    label: "Documents",
    items: [
      { key: "agreements", label: "Agreements", route: "/agreements", icon: "FileSignature" },
    ],
  },
  {
    label: "Growth",
    items: [
      { key: "social", label: "Social Media", route: "/social", icon: "Share2" },
      { key: "ai-image", label: "AI Studio", route: "/ai-image", icon: "Sparkles" },
    ],
  },
  {
    label: "Communication",
    items: [
      { key: "chat", label: "Team Chat", route: "/chat", icon: "MessageSquare" },
      { key: "notifications", label: "Notifications", route: "/notifications", icon: "Bell" },
    ],
  },
  {
    label: "Admin",
    items: [
      { key: "admin-users", label: "User Management", route: "/admin/users", icon: "UserCog" },
      { key: "admin-access", label: "Access Control", route: "/admin/access", icon: "Key" },
      { key: "admin-integrations", label: "Integrations", route: "/admin/integrations", icon: "Plug" },
      { key: "admin-roles", label: "Roles & Permissions", route: "/admin/roles", icon: "Shield" },
    ],
  },
];

// Flat list for dynamic module merging
const STATIC_MODULES = NAV_GROUPS.flatMap((g) => g.items);

export default function Sidebar() {
  const pathname = usePathname();
  const [modules, setModules] = useState<any[]>(STATIC_MODULES);
  const [open, setOpen] = useState(false);
  const [businessName, setBusinessName] = useState("AN Group");

  useEffect(() => {
    loadSidebar();
  }, []);

  async function loadSidebar() {
    try {
      const businessId = localStorage.getItem("businessId");
      if (!businessId) return;

      const res = await fetch("/api/ui/sidebar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "demo-user", businessId }),
      });

      const data = await res.json();

      if (data.success && data.modules?.length > 0) {
        const dbKeys = new Set(data.modules.map((m: any) => m.key));
        const extra = STATIC_MODULES.filter((m) => !dbKeys.has(m.key));
        setModules([...data.modules, ...extra]);
        if (data.business?.name) setBusinessName(data.business.name);
      }
    } catch {
      // keep static fallback
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-xl lg:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:relative z-50 h-screen w-72 transform border-r border-white/[0.06] bg-zinc-950 transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="px-6 pt-8 pb-6 border-b border-white/[0.05]">
          <p className="text-[10px] uppercase tracking-[0.45em] text-zinc-600">
            Executive Platform
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
            {businessName}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-zinc-500">Fully Operational</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => {
            // Filter group items to only those present in the (possibly DB-enriched) modules list
            const moduleKeys = new Set(modules.map((m: any) => m.key));
            const visibleItems = group.items.filter((item) => moduleKeys.has(item.key));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="mb-4">
                <p className="px-3 mb-1 text-[9px] uppercase tracking-[0.45em] text-zinc-600 font-semibold">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    // Merge DB module data (label/route overrides) if present
                    const dbMod = modules.find((m: any) => m.key === item.key);
                    const m = { ...item, ...(dbMod || {}) };

                    const active =
                      pathname === m.route ||
                      (m.route !== "/" && m.route.length > 1 && pathname?.startsWith(m.route));
                    const IconComp = ICON_MAP[m.icon] || Building2;

                    return (
                      <Link
                        key={m.key}
                        href={m.route}
                        onClick={() => setOpen(false)}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                          active
                            ? "bg-white/[0.08] text-white border border-white/[0.08]"
                            : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                        }`}
                      >
                        <IconComp
                          size={15}
                          className={active ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"}
                        />
                        <span className="text-sm font-medium">{m.label}</span>
                        {active && (
                          <ChevronRight size={13} className="ml-auto text-zinc-600" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-5 border-t border-white/[0.05]">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-600">Status</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs text-zinc-400">All Systems Normal</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
