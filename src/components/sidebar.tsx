"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight, ChevronLeft, Menu, X, LayoutDashboard, Package, ShoppingCart,
  TrendingUp, DollarSign, Users, UserCheck, FileSignature, Share2,
  Sparkles, Plug, Shield, Bell, MessageSquare, Building2, UserCog,
  Key, UserPlus, ChevronDown, Check, LogOut, ShoppingBag,
  Box, Hash, Truck, Activity, FileText, PhoneCall, ClipboardList,
  BarChart3, Ruler, Tags, Layers, Bot, MapPin, FolderOpen, Settings,
  ArrowLeftRight, SlidersHorizontal, ShieldCheck, Smartphone,
} from "lucide-react";
import { useToast } from "@/components/shared/Toast";

const SIDEBAR_COLLAPSED_KEY = "an_sidebar_collapsed";

interface Business { _id: string; name: string; brandName?: string; businessCode?: string; isPlatform?: boolean }
interface UserInfo {
  id: string; name: string; email: string; role: string;
  isSuperAdmin: boolean; activeBusinessId: string | null;
  isPlatformStaff?: boolean;
  moduleOrder?: string[];
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard, Package, ShoppingCart, TrendingUp, DollarSign,
  Users, UserCheck, FileSignature, Share2, Sparkles,
  Plug, Shield, Bell, MessageSquare, Building2, UserCog,
  Key, UserPlus, ShoppingBag, Box, Hash, Truck, Activity, FileText,
  PhoneCall, ClipboardList, BarChart3, Ruler, Tags, Layers, Bot,
  MapPin, FolderOpen, Settings, ArrowLeftRight, SlidersHorizontal,
  ShieldCheck, Smartphone,
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

export const NAV_GROUPS: NavGroup[] = [
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
      // These 4 pages existed with complete, working CRUD UIs this whole
      // time but had no sidebar entry at all — same class of bug as the
      // Invoice Branding / GST entries documented further below.
      { key: "masters-units",    label: "Units",              route: "/admin/masters/units",              icon: "Ruler" },
      { key: "masters-brands",   label: "Brands",             route: "/admin/masters/brands",              icon: "Tags" },
      { key: "masters-models",  label: "Device Models",      route: "/admin/masters/models",              icon: "Smartphone" },
      { key: "masters-prod-cat", label: "Product Categories", route: "/admin/masters/product-categories",  icon: "Layers" },
      { key: "masters-mat-cat",  label: "Material Categories",route: "/admin/masters/material-categories", icon: "Layers" },
      // Same bug again — these 2 also had complete, working pages with no
      // sidebar entry at all.
      { key: "masters-fault-codes", label: "Fault Codes", route: "/admin/masters/fault-codes", icon: "AlertTriangle" },
      { key: "masters-symptom-codes", label: "Symptom Codes", route: "/admin/masters/symptom-codes", icon: "AlertTriangle" },
      { key: "masters-solutions",   label: "Solutions",   route: "/admin/masters/solutions",   icon: "CheckCircle" },
      { key: "masters-crm-options", label: "CRM Job Sheet Options", route: "/admin/masters/crm-options", icon: "Settings" },
      // Stock movement screens — also fully built, never wired to nav.
      { key: "stock-transfers",   label: "Stock Transfers",   route: "/admin/stock-transfers",   icon: "ArrowLeftRight" },
      { key: "stock-adjustments", label: "Stock Adjustments", route: "/admin/stock-adjustments", icon: "SlidersHorizontal" },
      { key: "inventory-lots",    label: "Inventory Lots",    route: "/admin/inventory/lots",    icon: "Box" },
    ]},
    { key: "ops-purchase", label: "Purchase", items: [
      { key: "purchase",        label: "Purchase",        route: "/admin/purchase",         icon: "ShoppingCart" },
      { key: "purchase-orders", label: "Purchase Orders", route: "/admin/purchase-orders",  icon: "ShoppingCart" },
      // Was its own sidebar entry ("Vendor Products") pointing at a dead
      // stub page — consolidated into the single "Products" entry above;
      // the pending-approvals queue is now reached via a button inside that
      // page (super admin only), not a second top-level menu item, per
      // explicit direction to keep exactly one product-related menu entry.
    ]},
    { key: "ops-production", label: "Manufacturing", items: [
      { key: "bom",        label: "Bill of Materials", route: "/admin/bom",        icon: "Box" },
      { key: "production", label: "Production",        route: "/admin/production", icon: "Package" },
    ]},
    { key: "ops-finance", label: "Finance", items: [
      { key: "finance", label: "Finance", route: "/admin/finance", icon: "DollarSign" },
      { key: "vendor-settlements", label: "Vendor Settlements", route: "/admin/vendor-settlements", icon: "DollarSign" },
    ]},
  ]},
  { label: "Business", items: [
    { key: "businesses", label: "Businesses",   route: "/admin/business",   icon: "Building2" },
    { key: "vendors",    label: "Vendors",      route: "/admin/vendors",    icon: "Truck" },
    { key: "customers",  label: "Customer Data", route: "/admin/customers", icon: "Users" },
  ]},
  { label: "People", subgroups: [
    { key: "ppl-hr", label: "Human Resources", items: [
      { key: "hr",        label: "HR Overview",  route: "/admin/hr",         icon: "UserCheck" },
      { key: "employees", label: "Employees",    route: "/admin/employees",  icon: "Users" },
      { key: "hr-leave",  label: "Leave",        route: "/admin/hr/leave",   icon: "UserCheck" },
      { key: "hr-payroll",label: "Payroll",      route: "/admin/hr/payroll", icon: "DollarSign" },
      // Real working document-vault page (upload/download/expiry tracking
      // for employee docs) — no nav entry existed for it at all.
      { key: "hr-documents", label: "Documents", route: "/admin/hr/documents", icon: "FolderOpen" },
    ]},
    { key: "ppl-crm", label: "CRM", items: [
      { key: "crm", label: "CRM Overview", route: "/admin/crm", icon: "UserPlus" },
      // Gated on the CRM_CALLS.VIEW / CRM_JOBSHEETS.VIEW permission codes
      // auto-generated by syncPermissionsForModule once
      // /api/admin/seed-crm-modules has been run — see that route's top
      // comment. Keys match the ModuleDefinition.key values exactly
      // ("crm_calls", "crm_jobsheets") so isVisible()'s moduleKeys.has()
      // check lines up with what /api/ui/sidebar actually returns.
      { key: "crm_calls",     label: "Appointments", route: "/admin/crm/calls",     icon: "PhoneCall" },
      { key: "crm_jobsheets", label: "Workorders",   route: "/admin/crm/jobsheets", icon: "ClipboardList" },
    ]},
  ]},
  { label: "Documents", items: [
    { key: "agreements",      label: "Agreements",      route: "/admin/agreements",       icon: "FileSignature" },
    { key: "admin-doc-nos",   label: "Document Numbers",route: "/admin/document-numbers", icon: "Hash" },
  ]},
  { label: "Reports", items: [
    { key: "reports",   label: "Reports & Downloads", route: "/admin/reports",   icon: "BarChart3" },
    // Real page wired to /api/analytics/overview — was an orphaned
    // root-level route (src/app/analytics/page.tsx) with no nav entry at
    // all before being moved under /admin; see that page's top comment.
    { key: "analytics", label: "Analytics",           route: "/admin/analytics", icon: "BarChart3" },
  ]},
  { label: "Growth", items: [
    { key: "social",   label: "Social Media", route: "/admin/social",    icon: "Share2" },
    { key: "ai-image", label: "AI Studio",    route: "/admin/ai-image",  icon: "Sparkles" },
    { key: "native",   label: "Native App",   route: "/admin/native",    icon: "MessageSquare" },
    // ANu is no longer a page -- it's the floating AnuWidget (see
    // AdminShell.tsx), reachable from every admin page via the icon at
    // bottom-left, so it doesn't need (and shouldn't have) a nav entry
    // that navigates away from whatever the user was doing.
  ]},
  { label: "Logistics", items: [
    // Real page wired to /api/logistics/overview — was an orphaned
    // root-level route rendering hardcoded numbers before being moved and
    // rewired; see admin/logistics/page.tsx's top comment.
    { key: "logistics", label: "Logistics & Shipping", route: "/admin/logistics", icon: "Truck" },
  ]},
  { label: "Communication", items: [
    { key: "chat", label: "Team Chat", route: "/admin/chat", icon: "MessageSquare" },
    // Notifications is likewise no longer a page -- it's the floating
    // NotificationBell icon (top-right, every admin page), same reasoning
    // as ANu above.
  ]},
  { label: "Admin", subgroups: [
    { key: "adm-users", label: "Users & Access", items: [
      { key: "admin-users",  label: "User Management",      route: "/admin/users",  icon: "UserCog" },
      { key: "admin-access", label: "Access Control",       route: "/admin/access", icon: "Key" },
      { key: "admin-roles",  label: "Roles & Permissions",  route: "/admin/roles",  icon: "Shield" },
      { key: "admin-an-group-staff", label: "AN Group Staff", route: "/admin/an-group-staff", icon: "Shield" },
    ]},
    { key: "adm-config", label: "Configuration", items: [
      { key: "admin-intg", label: "Integrations", route: "/admin/integrations", icon: "Plug" },
      { key: "admin-sso",  label: "SSO / Auth",   route: "/admin/sso",          icon: "Key" },
      { key: "admin-status", label: "System Status", route: "/admin/system-status", icon: "Activity" },
      { key: "admin-modules", label: "Modules", route: "/admin/modules", icon: "Box" },
      { key: "admin-document-templates", label: "Document Templates", route: "/admin/document-templates", icon: "FileText" },
      // Full business-config hub (business profile, document numbering
      // shortcuts, integrations shortcut, account) — built, never wired.
      { key: "admin-settings", label: "Settings", route: "/admin/settings", icon: "Settings" },
      // Admin tool for refreshing the India pincode autofill dataset —
      // built (with a real MongoDB-backed upload flow, since Vercel's
      // filesystem is read-only), never wired to nav.
      { key: "admin-pincode-data", label: "Pincode Data", route: "/admin/pincode-data", icon: "MapPin" },
      // This page has existed with a complete, working CRUD UI + API this
      // whole time — it just never had a sidebar entry pointing to it, so
      // nobody could reach it from the nav (had to know the URL directly).
      { key: "admin-invoice-templates", label: "Invoice Branding", route: "/admin/invoice-templates", icon: "FileText" },
      // Same class of bug as Invoice Branding above — the GST filings/settings
      // page (admin/gst/page.tsx) has existed with a complete UI + API this
      // whole time but never had a sidebar entry, so it was unreachable from nav.
      { key: "admin-gst", label: "GST", route: "/admin/gst", icon: "FileText" },
      // Same class of bug again — a complete, working feedback inbox with
      // no sidebar entry at all, unreachable except by typing the URL.
      { key: "admin-feedback", label: "Feedback", route: "/admin/feedback", icon: "MessageSquare" },
    ]},
  ]},
];

export const STATIC_MODULES = NAV_GROUPS.flatMap((g) =>
  g.items ? g.items : (g.subgroups ?? []).flatMap((sg) => sg.items)
);

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const toast    = useToast();

  // Was initialized to STATIC_MODULES (the FULL, unfiltered nav list) as a
  // "safe" default -- but that meant any account whose permission fetch
  // hadn't resolved yet, failed, or genuinely came back with a short list
  // fell straight through to seeing EVERY module in the sidebar, since the
  // old fetch handler only ever called setModules() when the response was
  // both successful AND non-empty (see loadSidebarModules below). This is
  // the actual reason every permission fix for a limited-access role
  // "didn't stick": no matter how correctly scoped the API's response was,
  // a slow network, a legitimate zero-module business, or any upstream
  // hiccup silently fell back to showing everything. Starts empty now --
  // nothing shows until the API actually confirms what this account may
  // see, and an empty/failed response means an empty sidebar, not a full one.
  const [modules, setModules]           = useState<any[]>([]);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [open, setOpen]                 = useState(false);
  const [collapsed, setCollapsed]       = useState(false);
  // When the sidebar is collapsed to icon-only, hovering over it expands it
  // back temporarily (without flipping the persisted preference) so labels
  // are reachable without a click -- "menu bar also make it collapsable and
  // expand on hover".
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const isCollapsed = collapsed && !hoverExpanded;
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

  // Unread-count badge now lives on the floating NotificationBell icon
  // (AdminShell.tsx) instead of this sidebar nav item, since Notifications
  // is no longer a page to navigate to.

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
        // Super admins / AN Group platform staff land on the real AN Group
        // business (no auto-pick into a random tenant business) unless the
        // JWT already has a real activeBusinessId — a tenant business must
        // never be silently auto-selected out from under them, since that
        // was hiding platform-wide features (Modules, cross-business
        // reports, etc.) behind a business context nobody explicitly chose.
        // Non-super-admin users still default to their first business,
        // since they have no AN Group / platform view to fall back to.
        const found = data.user?.activeBusinessId
          ? data.businesses?.find((b: Business) => b._id === data.user.activeBusinessId) || null
          : (data.user?.isSuperAdmin || data.user?.isPlatformStaff)
            ? data.businesses?.find((b: Business) => b.isPlatform) || null
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
      // Trust the API's list exactly as returned -- including an empty
      // one. api/ui/sidebar/route.ts already does the real filtering
      // (permission-based, plus explicitly excluding modules the business
      // admin disabled via Business.modules); this used to only call
      // setModules() when the list was non-empty, silently keeping
      // whatever was there before (the full STATIC_MODULES list on first
      // load) for any account with a short or zero-length real list. A
      // limited-access role account is SUPPOSED to see a short list --
      // that must render as a short sidebar, not fall back to everything.
      setModules(data.success ? (data.modules || []) : []);
    } catch {
      setModules([]);
    } finally {
      setModulesLoaded(true);
    }
  }

  async function switchBusiness(biz: Business) {
    if (switching) return;
    // AN Group is a real Business record for DISPLAY/selection purposes
    // (dropdowns, Admin > Access, role scoping), but it must NOT become a
    // real x-active-business-id in the session -- every existing
    // business-scoped list route in this app (Brands, Products, Vendors,
    // etc.) filters strictly by that header, and AN Group's own Business
    // document legitimately has zero brands/products/vendors of its own.
    // Setting it as a real active business made every one of those pages
    // look like all its data had vanished. "AN Group sees everything" is
    // the SAME thing the old cross-business/no-active-business state
    // already meant for Super Admin -- so selecting AN Group clears the
    // active business (exit-business) instead of switching into it as if
    // it were a normal tenant.
    if (biz.isPlatform) {
      if (!user?.activeBusinessId) { setBizDropdown(false); return; }
      setSwitching(true);
      try {
        const res = await fetch("/api/auth/exit-business", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          setActiveBiz(biz);
          setUser((prev) => prev ? { ...prev, activeBusinessId: null } : prev);
          setBizDropdown(false);
          router.refresh();
        } else {
          toast.error(data.message || "Failed to switch to AN Group");
        }
      } catch {
        toast.error("Failed to connect to server");
      } finally { setSwitching(false); }
      return;
    }

    if (biz._id === user?.activeBusinessId) { setBizDropdown(false); return; }
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
      } else {
        toast.error(data.message || "Failed to switch business");
      }
    } catch {
      toast.error("Failed to connect to server");
    } finally { setSwitching(false); }
  }


  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* silent */ }
    router.push("/login");
  }

  const moduleKeys = new Set(modules.map((m: any) => m.key));

  // Per-role custom nav ordering (admin/access page's "Sidebar Order"
  // editor, via Role.moduleOrder) -- items whose key appears in the list
  // are moved to the front in that order (e.g. CRM Overview before
  // Appointments/Workorders); anything not listed keeps its original
  // relative position after them. Scoped to within each group/subgroup's
  // own item list, not a full nav restructure.
  const roleOrder: string[] = user?.moduleOrder || [];
  function applyModuleOrder<T extends { key: string }>(items: T[]): T[] {
    if (!roleOrder.length) return items;
    const ranked: T[] = [];
    const rest: T[] = [];
    for (const item of items) {
      if (roleOrder.includes(item.key)) ranked.push(item); else rest.push(item);
    }
    ranked.sort((a, b) => roleOrder.indexOf(a.key) - roleOrder.indexOf(b.key));
    return [...ranked, ...rest];
  }

  // "Modules" (the module-DEFINITION editor) is a platform-level admin
  // capability, not a per-business seeded module in the ui/sidebar sense —
  // gating it behind moduleKeys would hide it until someone separately
  // seeds an "admin-modules" entry there. Always show it for super admins
  // instead, the same way the business-exit banner bypasses normal gating.
  const isVisible = (key: string) =>
    moduleKeys.has(key) ||
    (key === "admin-modules" && user?.isSuperAdmin) ||
    // Document Templates / Invoice Branding / GST are core platform
    // config, not per-business toggleable modules — but these three used
    // to be shown unconditionally to EVERY logged-in user regardless of
    // role or permissions (a real over-exposure bug: a plain customer or
    // employee account saw GST filing / invoice branding / document
    // templates in their sidebar with no permission check at all). Now
    // gated the same way "admin-modules" already correctly was, to
    // super admins only, until these get proper per-business permission
    // codes like every other module.
    (key === "admin-document-templates" && user?.isSuperAdmin) ||
    (key === "admin-invoice-templates" && user?.isSuperAdmin) ||
    (key === "admin-gst" && user?.isSuperAdmin) ||
    (key === "admin-an-group-staff" && user?.isSuperAdmin) ||
    (key === "admin-feedback" && user?.isSuperAdmin) ||
    (key === "masters-crm-options" && user?.isSuperAdmin);

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
        onMouseEnter={() => collapsed && setHoverExpanded(true)}
        onMouseLeave={() => setHoverExpanded(false)}
        className={`fixed lg:sticky lg:top-0 z-50 h-screen w-60 shrink-0 flex flex-col relative
          border-r border-gray-200 bg-white transform transition-all duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-16" : "lg:w-60"}
          ${hoverExpanded ? "lg:shadow-xl" : ""}`}
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
          {isCollapsed ? (
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
                  {user?.isSuperAdmin ? <span className="text-indigo-600 font-medium">Super Admin</span> : (user?.role || "Operational")}
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
              title={activeBiz ? (activeBiz.isPlatform ? "AN Group" : (activeBiz.brandName || activeBiz.name)) : "Select Business"}
              className={`flex w-full items-center rounded-lg border border-gray-200 bg-gray-50 py-2 text-left transition hover:bg-gray-100 disabled:opacity-60 ${
                isCollapsed ? "justify-center px-0" : "justify-between px-3"
              }`}
            >
              <div className={`flex items-center gap-2 min-w-0 ${isCollapsed ? "" : ""}`}>
                <Building2 size={12} className="shrink-0 text-gray-400" />
                {!isCollapsed && (
                  <span className="truncate text-xs font-medium text-gray-700">
                    {activeBiz ? (activeBiz.isPlatform ? "AN Group" : (activeBiz.brandName || activeBiz.name)) : "Select Business"}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown size={12} className={`shrink-0 text-gray-400 transition-transform ${bizDropdown ? "rotate-180" : ""}`} />
              )}
            </button>

            {bizDropdown && (
              <div className={`absolute top-full mt-1 z-50 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden ${
                isCollapsed ? "left-3 w-56" : "left-3 right-3"
              }`}>
                {/* AN Group (the platform owner itself) is a real Business
                    record now (see anGroupBusiness.service.ts) so it's a
                    real, selectable entry in this same list -- but
                    selecting it clears the active business rather than
                    scoping into it as a real tenant (see switchBusiness's
                    isPlatform branch), since AN Group means "see across
                    every business", the same thing "no active business"
                    already meant for Super Admin everywhere else in the
                    app. Visible to every Super Admin / AN Group
                    platform-staff account since api/auth/me's isPlatformStaff
                    branch always includes it. */}
                {[...businesses].sort((a, b) => (b.isPlatform ? 1 : 0) - (a.isPlatform ? 1 : 0)).map((biz) => {
                  const isActive = biz.isPlatform ? !user?.activeBusinessId : biz._id === user?.activeBusinessId;
                  return (
                    <button
                      key={biz._id}
                      onClick={() => switchBusiness(biz)}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 ${biz.isPlatform ? "bg-gray-50" : ""}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {biz.isPlatform && <LogOut size={12} className="shrink-0 text-gray-500" />}
                        <div className="min-w-0">
                          <p className="truncate text-xs text-gray-800 font-medium">{biz.isPlatform ? "AN Group" : (biz.brandName || biz.name)}</p>
                          {!biz.isPlatform && biz.businessCode && <p className="text-[10px] text-gray-400">{biz.businessCode}</p>}
                        </div>
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
            dropdown is closed, so a super admin/AN Group staff member
            never loses track of the fact they're scoped into one tenant
            business and forgets there's a way back to AN Group. Hidden
            when AN Group itself is the active business, since that IS the
            "way out" state. */}
        {!isCollapsed && (user?.isSuperAdmin || user?.isPlatformStaff) && activeBiz && !activeBiz.isPlatform && (
          <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
            <span className="truncate text-[10px] text-amber-700">
              Viewing as: <strong>{activeBiz.brandName || activeBiz.name}</strong>
            </span>
            <button
              onClick={() => {
                const anGroup = businesses.find((b) => b.isPlatform);
                if (anGroup) switchBusiness(anGroup);
              }}
              disabled={switching}
              title="Return to AN Group view"
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
                  title={isCollapsed ? m.label : undefined}
                  className={`group flex items-center gap-2.5 rounded-lg py-2 transition-all duration-150 ${
                    isCollapsed ? "justify-center px-0" : indent ? "pl-5 pr-3" : "px-3"
                  } ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <IconComp
                    size={14}
                    className={active ? "text-white" : "text-gray-400 group-hover:text-gray-600"}
                  />
                  {!isCollapsed && <span className="text-[13px] font-medium">{m.label}</span>}
                  {!isCollapsed && active && <ChevronRight size={12} className="ml-auto text-gray-400" />}
                </Link>
              );
            };

            return (
              <div key={group.label} className="mb-4">
                {/* Section header */}
                {!isCollapsed && (
                  <p className="px-3 mb-1 text-[9px] uppercase tracking-[0.45em] text-gray-400 font-semibold">
                    {group.label}
                  </p>
                )}

                {/* Flat items */}
                {group.items && (
                  <div className="space-y-0.5">
                    {applyModuleOrder(group.items.filter((item) => isVisible(item.key)))
                      .map((item) => renderItem(item))}
                  </div>
                )}

                {/* Nested sub-groups */}
                {group.subgroups && (
                  // Collapsed mode hides every subgroup's text header (below),
                  // so a 0.5-unit gap left different subgroups' icon columns
                  // visually blending into one undifferentiated stack with no
                  // way to tell where "Sales" ends and "Inventory" begins.
                  // Collapsed mode gets real spacing instead; expanded mode
                  // keeps the tight spacing since the headers already do the
                  // separating there.
                  <div className={isCollapsed ? "space-y-2.5" : "space-y-0.5"}>
                    {group.subgroups.map((sg, sgIndex) => {
                      const visibleSgItems = applyModuleOrder(sg.items.filter((i) => isVisible(i.key)));
                      if (visibleSgItems.length === 0) return null;
                      const sgOpen = openSubgroups[sg.key] !== false;

                      return (
                        <div key={sg.key}>
                          {/* Sub-group toggle header */}
                          {!isCollapsed && (
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

                          {/* Collapsed mode: a thin divider stands in for the
                              hidden text header, so each subgroup still reads
                              as its own visually distinct block of icons. */}
                          {isCollapsed && sgIndex > 0 && (
                            <div className="mx-3 mb-2.5 border-t border-gray-100" />
                          )}

                          {/* Sub-group items */}
                          {(sgOpen || isCollapsed) && (
                            <div className="space-y-0.5 mt-0.5">
                              {visibleSgItems.map((item) => renderItem(item, !isCollapsed))}
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
            <div className={`rounded-lg border border-gray-200 bg-gray-50 ${isCollapsed ? "p-2" : "p-3"}`}>
              <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "justify-between"}`}>
                {!isCollapsed && (
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
