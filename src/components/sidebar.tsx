"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight, Menu, X, LayoutDashboard, Package, ShoppingCart,
  TrendingUp, DollarSign, Users, UserCheck, FileSignature, Share2,
  Sparkles, Plug, Shield, Bell, MessageSquare, Building2, UserCog,
  Key, Store, UserPlus, ChevronDown, Check, LogOut, ShoppingBag,
  Box, Hash, Truck,
} from "lucide-react";

interface Business { _id: string; name: string; brandName?: string; businessCode?: string }
interface UserInfo {
  id: string; name: string; email: string; role: string;
  isSuperAdmin: boolean; activeBusinessId: string | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, Package, ShoppingCart, TrendingUp, DollarSign,
  Users, UserCheck, FileSignature, Share2, Sparkles,
  Plug, Shield, Bell, MessageSquare, Building2, UserCog,
  Key, Store, UserPlus, ShoppingBag, Box, Hash, Truck,
};

const NAV_GROUPS = [
  { label: "Overview", items: [
    { key: "dashboard",  label: "Dashboard",    route: "/admin",            icon: "LayoutDashboard" },
  ]},
  { label: "Operations", items: [
    { key: "orders",     label: "Orders",       route: "/admin/orders",     icon: "ShoppingBag" },
    { key: "inventory",  label: "Inventory",    route: "/admin/inventory",  icon: "Package" },
    { key: "products",   label: "Products",     route: "/admin/products",   icon: "Box" },
    { key: "purchase",   label: "Purchase",     route: "/admin/purchase",   icon: "ShoppingCart" },
    { key: "sales",      label: "Sales",        route: "/admin/sales",      icon: "TrendingUp" },
    { key: "finance",    label: "Finance",      route: "/admin/finance",    icon: "DollarSign" },
  ]},
  { label: "eCommerce", items: [
    { key: "native",     label: "Native Store", route: "/admin/native",    icon: "Store" },
  ]},
  { label: "Vendors", items: [
    { key: "vendors",    label: "Vendors",      route: "/admin/vendors",    icon: "Truck" },
  ]},
  { label: "People", items: [
    { key: "hr",         label: "HR",           route: "/admin/hr",         icon: "UserCheck" },
    { key: "employees",  label: "Employees",    route: "/admin/employees",  icon: "Users" },
    { key: "crm",        label: "CRM",          route: "/admin/crm",        icon: "UserPlus" },
  ]},
  { label: "Documents", items: [
    { key: "agreements", label: "Agreements",   route: "/admin/agreements", icon: "FileSignature" },
  ]},
  { label: "Growth", items: [
    { key: "social",    label: "Social Media",  route: "/admin/social",    icon: "Share2" },
    { key: "ai-image",  label: "AI Studio",    route: "/admin/ai-image",  icon: "Sparkles" },
  ]},
  { label: "Communication", items: [
    { key: "chat",          label: "Team Chat",    route: "/admin/chat",          icon: "MessageSquare" },
    { key: "notifications", label: "Notifications",route: "/admin/notifications", icon: "Bell" },
  ]},
  { label: "Admin", items: [
    { key: "admin-users",   label: "User Management",     route: "/admin/users",            icon: "UserCog" },
    { key: "admin-access",  label: "Access Control",      route: "/admin/access",           icon: "Key" },
    { key: "admin-roles",   label: "Roles & Permissions", route: "/admin/roles",            icon: "Shield" },
    { key: "admin-doc-nos", label: "Document Numbers",    route: "/admin/document-numbers", icon: "Hash" },
    { key: "admin-intg",    label: "Integrations",        route: "/admin/integrations",     icon: "Plug" },
  ]},
];

const STATIC_MODULES = NAV_GROUPS.flatMap((g) => g.items);

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [modules, setModules]         = useState<any[]>(STATIC_MODULES);
  const [open, setOpen]               = useState(false);
  const [user, setUser]               = useState<UserInfo | null>(null);
  const [businesses, setBusinesses]   = useState<Business[]>([]);
  const [activeBiz, setActiveBiz]     = useState<Business | null>(null);
  const [bizDropdown, setBizDropdown] = useState(false);
  const [switching, setSwitching]     = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setBizDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadUser() {
    try {
      const res  = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setBusinesses(data.businesses || []);
        const found =
          data.businesses?.find((b: Business) => b._id === data.user?.activeBusinessId) ||
          data.businesses?.[0] || null;
        setActiveBiz(found);
        if (found?._id) loadSidebarModules(found._id);
      }
    } catch { /* static fallback */ }
  }

  async function loadSidebarModules(businessId: string) {
    try {
      const res  = await fetch("/api/ui/sidebar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (data.success && data.modules?.length > 0) {
        const dbKeys = new Set(data.modules.map((m: any) => m.key));
        const extra  = STATIC_MODULES.filter((m) => !dbKeys.has(m.key));
        setModules([...data.modules, ...extra]);
      }
    } catch { /* static */ }
  }

  async function switchBusiness(biz: Business) {
    if (switching || biz._id === user?.activeBusinessId) { setBizDropdown(false); return; }
    setSwitching(true);
    try {
      const res  = await fetch("/api/auth/switch-business", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: biz._id }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("an_token", data.token);
        localStorage.setItem("an_user",  JSON.stringify(data.user));
        setActiveBiz(biz);
        setUser((prev) => prev ? { ...prev, activeBusinessId: biz._id } : prev);
        setBizDropdown(false);
        router.refresh();
        loadSidebarModules(biz._id);
      }
    } catch { /* silent */ } finally { setSwitching(false); }
  }

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* silent */ }
    localStorage.removeItem("an_token");
    localStorage.removeItem("an_user");
    router.push("/login");
  }

  const moduleKeys = new Set(modules.map((m: any) => m.key));

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-xl lg:hidden"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/70 lg:hidden" />
      )}

      <aside
        className={`fixed lg:relative z-50 h-screen w-60 transform border-r border-white/[0.06] bg-zinc-950 transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-4 border-b border-white/[0.05]">
          <p className="text-[9px] uppercase tracking-[0.45em] text-zinc-600">AN Group</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-white">Enterprise</h2>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] text-zinc-500">
              {user?.isSuperAdmin ? "Super Admin" : (user?.role || "Operational")}
            </p>
          </div>
        </div>

        {/* Business Switcher */}
        {businesses.length > 0 && (
          <div className="px-3 pt-3 pb-1 relative" ref={dropdownRef}>
            <button
              onClick={() => setBizDropdown(!bizDropdown)}
              disabled={switching}
              className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-left transition hover:bg-white/[0.07] disabled:opacity-60"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 size={12} className="shrink-0 text-zinc-500" />
                <span className="truncate text-xs font-medium text-white">
                  {activeBiz ? (activeBiz.brandName || activeBiz.name) : "Select Business"}
                </span>
              </div>
              <ChevronDown size={12} className={`shrink-0 text-zinc-600 transition-transform ${bizDropdown ? "rotate-180" : ""}`} />
            </button>

            {bizDropdown && (
              <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-white/10 bg-zinc-900 shadow-2xl overflow-hidden">
                {businesses.map((biz) => {
                  const isActive = biz._id === user?.activeBusinessId;
                  return (
                    <button
                      key={biz._id}
                      onClick={() => switchBusiness(biz)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-white/[0.05] border-b border-white/[0.03] last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-white font-medium">{biz.brandName || biz.name}</p>
                        {biz.businessCode && <p className="text-[10px] text-zinc-600">{biz.businessCode}</p>}
                      </div>
                      {isActive && <Check size={11} className="shrink-0 text-emerald-400 ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-none">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => moduleKeys.has(item.key));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-3">
                <p className="px-3 mb-1 text-[9px] uppercase tracking-[0.45em] text-zinc-600 font-semibold">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const dbMod = modules.find((m: any) => m.key === item.key);
                    const m     = { ...item, ...(dbMod || {}) };
                    const active =
                      m.route === "/admin"
                        ? pathname === "/admin"
                        : pathname === m.route ||
                          (m.route.length > 1 && pathname?.startsWith(m.route + "/"));
                    const IconComp = ICON_MAP[m.icon] || Building2;
                    return (
                      <Link
                        key={m.key}
                        href={m.route}
                        onClick={() => setOpen(false)}
                        className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-150 ${
                          active
                            ? "bg-white/[0.08] text-white border border-white/[0.08]"
                            : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                        }`}
                      >
                        <IconComp size={14} className={active ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"} />
                        <span className="text-[13px] font-medium">{m.label}</span>
                        {active && <ChevronRight size={12} className="ml-auto text-zinc-600" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-white/[0.05]">
          {user ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {user.isSuperAdmin ? "Super Admin" : user.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/10 transition"
                  title="Sign out"
                >
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-white/20 animate-pulse" />
                <span className="text-xs text-zinc-500">Loading…</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
