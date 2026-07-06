"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Menu, X, LayoutDashboard, Package, ShoppingCart,
  TrendingUp, DollarSign, Users, UserCheck, FileSignature, Share2,
  Sparkles, Plug, Shield, Bell, MessageSquare, Building2, UserCog,
  Key, UserPlus, ChevronDown, Check, LogOut, ShoppingBag,
  Box, Hash, Truck, Activity, FileText,
} from "lucide-react";

const SIDEBAR_COLLAPSED_KEY = "an_sidebar_collapsed";

interface Business { _id: string; name: string; brandName?: string; businessCode?: string }
interface UserInfo {
  id: string; name: string; email: string; role: string;
  isSuperAdmin: boolean; activeBusinessId: string | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, Package, ShoppingCart, TrendingUp, DollarSign,
  Users, UserCheck, FileSignature, Share2, Sparkles,
  Plug, Shield, Bell, MessageSquare, Building2, UserCog,
  Key, UserPlus, ShoppingBag, Box, Hash, Truck, Activity, FileText,
};

interface NavItem {
  key: string; label: string; route: string; icon: string;
}
interface NavSubGroup {
  key: string; label: string; items: NavItem[];
}
interface NavGroup {
  label: string;
  items?: NavItem[];
  subgroups?: NavSubGroup[];
}

const NAV_GROUPS: NavGroup[] = [
  { label: "Overview", items: [
    { key: "dashboard",  label: "Dashboard",    route: "/admin",            icon: "LayoutDashboard" },
  ]},
  { label: "Operations", subgroups: [
    { key: "ops-sales", label: "Sales", items: [
      { key: "orders",   label: "Orders",       route: "/admin/orders",     icon: "ShoppingBag" },
      { key: "sales",    label: "Sales",        route: "/admin/sales",      icon: "TrendingUp" },
      { key: "coupons",  label: "Coupons",      route: "/admin/coupons",    icon: "Hash" },
    ]},
    { key: "ops-inv", label: "Inventory", items: [
      { key: "inventory",  label: "Inventory",    route: "/admin/inventory",  icon: "Package" },
      { key: "products",   label: "Products",     route: "/admin/products",   icon: "Box" },
      { key: "warehouses", label: "Warehouses",   route: "/admin/warehouses", icon: "Building2" },
      { key: "materials",  label: "Materials",    route: "/admin/materials",  icon: "Box" },
    ]},
    { key: "ops-purchase", label: "Purchase", items: [
      { key: "purchase",        label: "Purchase",        route: "/admin/purchase",         icon: "ShoppingCart" },
      { key: "purchase-orders", label: "Purchase Orders", route: "/admin/purchase-orders",  icon: "ShoppingCart" },
    ]},
    { key: "ops-production", label: "Manufacturing", items: [
      { key: "bom",        label: "Bill of Materials", route: "/admin/bom",        icon: "Box" },
      { key: "production", label: "Production",        route: "/admin/production", icon: "Package" },
    ]},
    { key: "ops-finance", label: "Finance", items: [
      { key: "finance", label: "Finance", route: "/admin/finance", icon: "DollarSign" },
    ]},
  ]},
  { label: "Business", items: [
    { key: "businesses", label: "Businesses",   route: "/admin/business",   icon: "Building2" },
    { key: "vendors",    label: "Vendors",      route: "/admin/vendors",    icon: "Truck" },
  ]},
  { label: "People", subgroups: [
    { key: "ppl-hr", label: "Human Resources", items: [
      { key: "hr",        label: "HR Overview",  route: "/admin/hr",         icon: "UserCheck" },
      { key: "employees", label: "Employees",    route: "/admin/employees",  icon: "Users" },
      { key: "hr-leave",  label: "Leave",        route: "/admin/hr/leave",   icon: "UserCheck" },
      { key: "hr-payroll",label: "Payroll",      route: "/admin/hr/payroll", icon: "DollarSign" },
    ]},
    { key: "ppl-crm", label: "CRM", items: [
      { key: "crm", label: "CRM", route: "/admin/crm", icon: "UserPlus" },
    ]},
  ]},
  { label: "Documents", items: [
    { key: "agreements",      label: "Agreements",      route: "/admin/agreements",       icon: "FileSignature" },
    { key: "admin-doc-nos",   label: "Document Numbers",route: "/admin/document-numbers", icon: "Hash" },
  ]},
  { label: "Growth", items: [
    { key: "social",   label: "Social Media", route: "/admin/social",    icon: "Share2" },
    { key: "ai-image", label: "AI Studio",    route: "/admin/ai-image",  icon: "Sparkles" },
    { key: "native",   label: "Native App",   route: "/admin/native",    icon: "MessageSquare" },
  ]},
  { label: "Communication", items: [
    { key: "chat",          label: "Team Chat",     route: "/admin/chat",          icon: "MessageSquare" },
    { key: "notifications", label: "Notifications", route: "/admin/notifications", icon: "Bell" },
  ]},
  { label: "Admin", subgroups: [
    { key: "adm-users", label: "Users & Access", items: [
      { key: "admin-users",  label: "User Management",      route: "/admin/users",  icon: "UserCog" },
      { key: "admin-access", label: "Access Control",       route: "/admin/access", icon: "Key" },
      { key: "admin-roles",  label: "Roles & Permissions",  route: "/admin/roles",  icon: "Shield" },
    ]},
    { key: "adm-config", label: "Configuration", items: [
      { key: "admin-intg", label: "Integrations", route: "/admin/integrations", icon: "Plug" },
      { key: "admin-sso",  label: "SSO / Auth",   route: "/admin/sso",          icon: "Key" },
      { key: "admin-status", label: "System Status", route: "/admin/system-status", icon: "Activity" },
      { key: "admin-modules", label: "Modules", route: "/admin/modules", icon: "Box" },
      { key: "admin-document-templates", label: "Document Templates", route: "/admin/document-templates", icon: "FileText" },
    ]},
  ]},
];

const STATIC_MODULES = NAV_GROUPS.flatMap((g) =>
  g.items ? g.items : (g.subgroups ?? []).flatMap((sg) => sg.items)
);

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [modules, setModules]           = useState<any[]>(STATIC_MODULES);
  const [open, setOpen]                 = useState(false);
  const [collapsed, setCollapsed]       = useState(false);
  const [user, setUser]                 = useState<UserInfo | null>(null);
  const [businesses, setBusinesses]     = useState<Business[]>([]);
  const [activeBiz, setActiveBiz]       = useState<Business | null>(null);
  const [bizDropdown, setBizDropdown]   = useState(false);
  const [switching, setSwitching]       = useState(false);
  // Tracks which subgroups are open — default all open
  const [openSubgroups, setOpenSubgroups] = useState<Record<string, boolean>>(() => {
    const allOpen: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => (g.subgroups ?? []).forEach((sg) => { allOpen[sg.key] = true; }));
    return allOpen;
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadUser(); }, []);

  // Restore the desktop collapsed/expanded preference across visits.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch { /* localStorage unavailable — default to expanded */ }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      if (next) setBizDropdown(false);
      return next;
    });
  }

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
        // Super admins land in "All Businesses" (no auto-pick) unless the
        // JWT already has a real activeBusinessId — a business must never
        // be silently auto-selected out from under them, since that was
        // hiding platform-wide features (Modules, cross-business reports,
        // etc.) behind a business context nobody explicitly chose.
        // Non-super-admin users still default to their first business,
        // since they don't have an "all businesses" view to fall back to.
        const found = data.user?.activeBusinessId
          ? data.businesses?.find((b: Business) => b._id === data.user.activeBusinessId) || null
          : data.user?.isSuperAdmin
            ? null
            : data.businesses?.[0] || null;
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

  async function exitBusiness() {
    if (switching) return;
    setSwitching(true);
    try {
      const res  = await fetch("/api/auth/exit-business", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setActiveBiz(null);
        setUser((prev) => prev ? { ...prev, activeBusinessId: null } : prev);
        setBizDropdown(false);
        router.refresh();
      }
    } catch { /* silent */ } finally { setSwitching(false); }
  }

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* silent */ }
    router.push("/login");
  }

  const moduleKeys = new Set(modules.map((m: any) => m.key));

  // "Modules" (the module-DEFINITION editor) is a platform-level admin
  // capability, not a per-business seeded module in the ui/sidebar sense —
  // gating it behind moduleKeys would hide it until someone separately
  // seeds an "admin-modules" entry there. Always show it for super admins
  // instead, the same way the business-exit banner bypasses normal gating.
  const isVisible = (key: string) =>
    moduleKeys.has(key) ||
    (key === "admin-modules" && user?.isSuperAdmin) ||
    // Document Templates is core platform config, not a per-business
    // toggleable module (like Modules above) — always show it rather than
    // requiring every business's module set to separately include it.
    key === "admin-document-templates";

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
        className={`fixed lg:sticky lg:top-0 z-50 h-screen w-60 shrink-0 flex flex-col relative
          border-r border-gray-200 bg-white transform transition-all duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "lg:w-16" : "lg:w-60"}`}
      >
        {/* Desktop collapse/expand toggle */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex absolute -right-3 top-6 z-10 h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm hover:text-gray-700 hover:bg-gray-50"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          {collapsed ? (
            <div className="flex justify-center">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="AN Group" />
            </div>
          ) : (
            <>
              <p className="text-[9px] uppercase tracking-[0.45em] text-gray-400 font-medium">AN Group</p>
              <h2 className="mt-0.5 text-base font-bold tracking-tight text-gray-900">Enterprise</h2>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-gray-400">
                  {user?.isSuperAdmin ? "Super Admin" : (user?.role || "Operational")}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Business Switcher */}
        {businesses.length > 0 && (
          <div className="px-3 pt-3 pb-1 relative" ref={dropdownRef}>
            <button
              onClick={() => setBizDropdown(!bizDropdown)}
              disabled={switching}
              title={activeBiz ? (activeBiz.brandName || activeBiz.name) : (user?.isSuperAdmin ? "All Businesses" : "Select Business")}
              className={`flex w-full items-center rounded-lg border border-gray-200 bg-gray-50 py-2 text-left transition hover:bg-gray-100 disabled:opacity-60 ${
                collapsed ? "justify-center px-0" : "justify-between px-3"
              }`}
            >
              <div className={`flex items-center gap-2 min-w-0 ${collapsed ? "" : ""}`}>
                <Building2 size={12} className="shrink-0 text-gray-400" />
                {!collapsed && (
                  <span className="truncate text-xs font-medium text-gray-700">
                    {activeBiz ? (activeBiz.brandName || activeBiz.name) : (user?.isSuperAdmin ? "All Businesses" : "Select Business")}
                  </span>
                )}
              </div>
              {!collapsed && (
                <ChevronDown size={12} className={`shrink-0 text-gray-400 transition-transform ${bizDropdown ? "rotate-180" : ""}`} />
              )}
            </button>

            {bizDropdown && (
              <div className={`absolute top-full mt-1 z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden ${
                collapsed ? "left-3 w-56" : "left-3 right-3"
              }`}>
                {/* "All Businesses" is a first-class option for Super Admins,
                    not just a way to exit a business you got stuck in — it
                    always appears at the top of the list so choosing "look
                    at everything" is as deliberate a choice as picking one
                    specific business. */}
                {user?.isSuperAdmin && (
                  <button
                    onClick={exitBusiness}
                    disabled={switching}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left bg-gray-50 hover:bg-gray-100 border-b border-gray-100 disabled:opacity-60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <LogOut size={12} className="shrink-0 text-gray-500" />
                      <span className="truncate text-xs font-medium text-gray-700">All Businesses</span>
                    </div>
                    {!user?.activeBusinessId && <Check size={11} className="shrink-0 text-emerald-500 ml-2" />}
                  </button>
                )}

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

        {/* Persistent "currently viewing" banner — visible even when the
            dropdown is closed, so a super admin never loses track of the
            fact they're scoped into a single business and forgets there's
            a way out. */}
        {!collapsed && user?.isSuperAdmin && user?.activeBusinessId && activeBiz && (
          <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
            <span className="truncate text-[10px] text-amber-700">
              Viewing as: <strong>{activeBiz.brandName || activeBiz.name}</strong>
            </span>
            <button
              onClick={exitBusiness}
              disabled={switching}
              title="Return to Super Admin view"
              className="shrink-0 text-[10px] font-medium text-amber-700 underline hover:text-amber-900 disabled:opacity-60"
            >
              Exit
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-none">
          {NAV_GROUPS.map((group) => {
            // Collect all items from this group (flat or nested)
            const allItems: NavItem[] = group.items
              ? group.items
              : (group.subgroups ?? []).flatMap((sg) => sg.items);
            const hasVisible = allItems.some((item) => isVisible(item.key));
            if (!hasVisible) return null;

            // Helper: render a single nav link
            const renderItem = (item: NavItem, indent = false) => {
              const dbMod    = modules.find((m: any) => m.key === item.key);
              const m        = { ...item, ...(dbMod || {}) };
              const active   =
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
                  title={collapsed ? m.label : undefined}
                  className={`group flex items-center gap-2.5 rounded-lg py-2 transition-all duration-150 ${
                    collapsed ? "justify-center px-0" : indent ? "pl-5 pr-3" : "px-3"
                  } ${
                    active
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <IconComp
                    size={14}
                    className={active ? "text-white" : "text-gray-400 group-hover:text-gray-600"}
                  />
                  {!collapsed && <span className="text-[13px] font-medium">{m.label}</span>}
                  {!collapsed && active && <ChevronRight size={12} className="ml-auto text-gray-400" />}
                </Link>
              );
            };

            return (
              <div key={group.label} className="mb-4">
                {/* Section header */}
                {!collapsed && (
                  <p className="px-3 mb-1 text-[9px] uppercase tracking-[0.45em] text-gray-400 font-semibold">
                    {group.label}
                  </p>
                )}

                {/* Flat items */}
                {group.items && (
                  <div className="space-y-0.5">
                    {group.items
                      .filter((item) => isVisible(item.key))
                      .map((item) => renderItem(item))}
                  </div>
                )}

                {/* Nested sub-groups */}
                {group.subgroups && (
                  <div className="space-y-0.5">
                    {group.subgroups.map((sg) => {
                      const visibleSgItems = sg.items.filter((i) => isVisible(i.key));
                      if (visibleSgItems.length === 0) return null;
                      const sgOpen = openSubgroups[sg.key] !== false;

                      return (
                        <div key={sg.key}>
                          {/* Sub-group toggle header */}
                          {!collapsed && (
                            <button
                              onClick={() =>
                                setOpenSubgroups((p) => ({ ...p, [sg.key]: !sgOpen }))
                              }
                              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
                            >
                              <span>{sg.label}</span>
                              <ChevronDown
                                size={10}
                                className={`transition-transform ${sgOpen ? "" : "-rotate-90"}`}
                              />
                            </button>
                          )}

                          {/* Sub-group items */}
                          {(sgOpen || collapsed) && (
                            <div className="space-y-0.5 mt-0.5">
                              {visibleSgItems.map((item) => renderItem(item, !collapsed))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-gray-100">
          {user ? (
            <div className={`rounded-lg border border-gray-200 bg-gray-50 ${collapsed ? "p-2" : "p-3"}`}>
              <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "justify-between"}`}>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-800">{user.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {user.isSuperAdmin ? "Super Admin" : user.role}
                    </p>
                  </div>
                )}
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
