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
    router.push("/login");
  }

  const moduleKeys = new Set(modules.map((m: any) => m.key));

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm lg:hidden"
      >
        {open ? <X size={18} className="text-gray-700" /> : <Menu size={18} className="text-gray-700" />}
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" />
      )}

      <aside
        className={`fixed lg:sticky lg:top-0 z-50 h-screen w-60 shrink-0 flex flex-col
          border-r border-gray-200 bg-white transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="text-[9px] uppercase tracking-[0.45em] text-gray-400 font-medium">AN Group</p>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-gray-900">Enterprise</h2>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-gray-400">
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
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:bg-gray-100 disabled:opacity-60"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 size={12} className="shrink-0 text-gray-400" />
                <span className="truncate text-xs font-medium text-gray-700">
                  {activeBiz ? (activeBiz.brandName || activeBiz.name) : "Select Business"}
                </span>
              </div>
              <ChevronDown size={12} className={`shrink-0 text-gray-400 transition-transform ${bizDropdown ? "rotate-180" : ""}`} />
            </button>

            {bizDropdown && (
              <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                {businesses.map((biz) => {
                  const isActive = biz._id === user?.activeBusinessId;
                  return (
                    <button
                      key={biz._id}
                      onClick={() => switchBusiness(biz)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-gray-800 font-medium">{biz.brandName || biz.name}</p>
                        {biz.businessCode && <p className="text-[10px] text-gray-400">{biz.businessCode}</p>}
                      </div>
                      {isActive && <Check size={11} className="shrink-0 text-emerald-500 ml-2" />}
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
              <div key={group.label} className="mb-4">
                <p className="px-3 mb-1 text-[9px] uppercase tracking-[0.45em] text-gray-400 font-semibold">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const dbMod  = modules.find((m: any) => m.key === item.key);
                    const m      = { ...item, ...(dbMod || {}) };
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
                        className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-150 ${
                          active
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <IconComp
                          size={14}
                          className={active ? "text-white" : "text-gray-400 group-hover:text-gray-600"}
                        />
                        <span className="text-[13px] font-medium">{m.label}</span>
                        {active && <ChevronRight size={12} className="ml-auto text-gray-400" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-gray-100">
          {user ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-800">{user.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {user.isSuperAdmin ? "Super Admin" : user.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition"
                  title="Sign out"
                >
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-300 animate-pulse" />
                <span className="text-xs text-gray-400">Loading…</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
