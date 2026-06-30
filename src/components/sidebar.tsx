"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ChevronDown,
  Check,
  LogOut,
} from "lucide-react";

interface Business {
  _id: string;
  name: string;
  brandName?: string;
  businessCode?: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  activeBusinessId: string | null;
}

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
  const pathname    = usePathname();
  const router      = useRouter();
  const [modules, setModules]           = useState<any[]>(STATIC_MODULES);
  const [open, setOpen]                 = useState(false);
  const [businessName, setBusinessName] = useState("AN Group");
  const [user, setUser]                 = useState<UserInfo | null>(null);
  const [businesses, setBusinesses]     = useState<Business[]>([]);
  const [activeBiz, setActiveBiz]       = useState<Business | null>(null);
  const [bizDropdown, setBizDropdown]   = useState(false);
  const [switching, setSwitching]       = useState(false);
  const dropdownRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserAndSidebar();
  }, []);

  // Close business dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBizDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadUserAndSidebar() {
    try {
      const res  = await fetch("/api/auth/me");
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setBusinesses(data.businesses || []);

        const found = data.businesses?.find(
          (b: Business) => b._id === data.user?.activeBusinessId
        ) || data.businesses?.[0] || null;

        if (found) {
          setActiveBiz(found);
          setBusinessName(found.brandName || found.name);
        }

        await loadSidebar(data.user?.activeBusinessId || found?._id);
      }
    } catch {
      // keep static fallback
    }
  }

  async function loadSidebar(businessId?: string | null) {
    try {
      const res = await fetch("/api/ui/sidebar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id || "current", businessId }),
      });

      const data = await res.json();

      if (data.success && data.modules?.length > 0) {
        const dbKeys = new Set(data.modules.map((m: any) => m.key));
        const extra = STATIC_MODULES.filter((m) => !dbKeys.has(m.key));
        setModules([...data.modules, ...extra]);
        if (data.business?.name) setBusinessName(data.business.brandName || data.business.name);
      }
    } catch {
      // keep static fallback
    }
  }

  async function switchBusiness(biz: Business) {
    if (switching || biz._id === user?.activeBusinessId) {
      setBizDropdown(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await fetch("/api/auth/switch-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: biz._id }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("an_token", data.token);
        setActiveBiz(biz);
        setBusinessName(biz.brandName || biz.name);
        setUser((prev) => prev ? { ...prev, activeBusinessId: biz._id } : prev);
        setBizDropdown(false);
        router.refresh();
        await loadSidebar(biz._id);
      }
    } catch {
      // silent
    } finally {
      setSwitching(false);
    }
  }

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* silent */ }
    localStorage.removeItem("an_token");
    localStorage.removeItem("an_user");
    router.push("/login");
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
        <div className="px-6 pt-8 pb-5 border-b border-white/[0.05]">
          <p className="text-[10px] uppercase tracking-[0.45em] text-zinc-600">
            Executive Platform
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">
            AN Group
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-zinc-500">Fully Operational</p>
          </div>
        </div>

        {/* Business Switcher */}
        {businesses.length > 0 && (
          <div className="px-4 pt-4 pb-2 relative" ref={dropdownRef}>
            <p className="px-2 mb-1.5 text-[9px] uppercase tracking-[0.4em] text-zinc-600">
              Active Business
            </p>
            <button
              onClick={() => setBizDropdown(!bizDropdown)}
              disabled={switching}
              className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-left transition hover:bg-white/[0.07] disabled:opacity-60"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 size={13} className="shrink-0 text-zinc-500" />
                <span className="truncate text-xs font-medium text-white">
                  {activeBiz ? (activeBiz.brandName || activeBiz.name) : "Select Business"}
                </span>
              </div>
              <ChevronDown
                size={13}
                className={`shrink-0 text-zinc-600 transition-transform ${bizDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {bizDropdown && (
              <div className="absolute left-4 right-4 top-full mt-1 z-50 rounded-xl border border-white/10 bg-zinc-900/98 backdrop-blur-xl shadow-2xl overflow-hidden">
                <p className="px-3 py-2 text-[9px] uppercase tracking-[0.4em] text-zinc-600 border-b border-white/[0.05]">
                  Switch Business
                </p>
                {businesses.map((biz) => {
                  const isActive = biz._id === user?.activeBusinessId;
                  return (
                    <button
                      key={biz._id}
                      onClick={() => switchBusiness(biz)}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-white/[0.05] border-b border-white/[0.03] last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-white font-medium">
                          {biz.brandName || biz.name}
                        </p>
                        {biz.businessCode && (
                          <p className="text-[10px] text-zinc-600">{biz.businessCode}</p>
                        )}
                      </div>
                      {isActive && <Check size={12} className="shrink-0 text-white ml-2" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

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

        <div className="px-4 py-4 border-t border-white/[0.05]">
          {user ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {user.isSuperAdmin ? "Super Admin" : user.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-xl text-zinc-600 hover:text-white hover:bg-white/10 transition"
                  title="Sign out"
                >
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-600">Status</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs text-zinc-400">All Systems Normal</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
