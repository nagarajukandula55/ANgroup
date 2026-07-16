import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VendorLogoutButton from '@/components/vendor/VendorLogoutButton'
import AnuWidget from '@/components/AnuWidget'
import NotificationBell from '@/components/NotificationBell'
import { connectDB } from '@/lib/mongodb'
import BusinessMember from '@/models/BusinessMember'
import { resolveOwnerOrManagerVendor, getVendorStaffAccessMap } from '@/core/access/vendorAccess.service'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  FileText,
  User,
  BarChart3,
  Building2,
  Wallet,
  Warehouse,
  Users,
  Boxes,
  Phone,
  ClipboardList,
} from 'lucide-react'

// NOTE: Bill of Materials is intentionally NOT a top-level nav item — BOM
// is per-product (see /vendor/products/[id]/bom, already built and wired
// from each product's own detail page), not a flat vendor-wide list, so it
// belongs inside "My Products" rather than getting its own nav entry.
//
// `modules`: which granted module keys make this nav item visible to a
// STAFF member (Owner/Manager always see everything; managerOnly items are
// theirs regardless of module grants). null = visible to every team member.
const navItems: { href: string; label: string; icon: any; modules: string[] | null; managerOnly?: boolean }[] = [
  { href: '/vendor', label: 'Dashboard', icon: LayoutDashboard, modules: null },
  { href: '/vendor/products', label: 'My Products', icon: Package, modules: ['vendor_products', 'products'] },
  { href: '/vendor/inventory', label: 'Inventory', icon: Boxes, modules: ['inventory'] },
  { href: '/vendor/orders', label: 'My Orders', icon: ShoppingCart, modules: ['sales'] },
  { href: '/vendor/offline-sales', label: 'Offline Sales', icon: ShoppingBag, modules: ['sales'] },
  { href: '/vendor/warehouses', label: 'Warehouses', icon: Warehouse, modules: ['warehouses'] },
  // Service-center staff (CCO/Engineer/Centre Manager) already get
  // crm_calls/crm_jobsheets permissions via MEMBER_TYPE_IMPLIED_MODULES
  // (see vendor/staff/create/route.ts) but had no vendor-side page to use
  // them on -- only /admin/crm existed, which isn't theirs to navigate
  // into. These reuse the exact same /api/crm/calls, /api/crm/jobsheets
  // endpoints, just scoped to this vendor's own team.
  { href: '/vendor/crm/calls', label: 'Appointments', icon: Phone, modules: ['crm_calls', 'crm'] },
  { href: '/vendor/crm/jobsheets', label: 'Workorders', icon: ClipboardList, modules: ['crm_jobsheets', 'crm'] },
  { href: '/vendor/staff', label: 'Staff', icon: Users, modules: ['staff'], managerOnly: true },
  { href: '/vendor/invoices', label: 'Invoices & Payments', icon: FileText, modules: ['finance'] },
  { href: '/vendor/payouts', label: 'Payout Settings', icon: Wallet, modules: ['finance'], managerOnly: true },
  // Was labeled only "My Profile" -- this IS the vendor's settings page
  // (backed by /api/vendor/settings), already fully accessible to every
  // Owner/Manager (modules: null), but an Owner/Manager looking for
  // "Settings" specifically didn't recognize this as it and believed they
  // had no settings access at all.
  { href: '/vendor/profile', label: 'My Profile / Settings', icon: User, modules: null },
  { href: '/vendor/statement', label: 'Financial Statement', icon: BarChart3, modules: ['finance'] },
]

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const role = headersList.get('x-user-role')
  const userId = headersList.get('x-user-id')
  const userName = headersList.get('x-user-name') || 'Vendor'

  // role !== 'VENDOR' used to be the ONLY check here -- but that's
  // User.role, the old flat single-role field set at signup/login. It has
  // nothing to do with the newer vendor-team system (BusinessMember +
  // vendorId-scoped Role/UserRole, see api/vendor/staff/route.ts): a
  // super admin adding someone as a vendor's Owner/Manager/etc. through
  // that flow never touches User.role at all, so anyone whose account
  // originally registered as a plain customer (the default) got bounced
  // straight back to /login on every single /vendor/* page, no matter
  // what access they'd actually been granted -- this was the "repeatedly
  // redirecting to login" report. Now also allows in anyone with an
  // ACTIVE BusinessMember row tied to a real vendor (vendorId set), which
  // is what actually grants vendor-portal access today.
  let hasVendorTeamAccess = false
  let membership: any = null
  if (role !== 'VENDOR' && userId) {
    try {
      await connectDB()
      membership = await BusinessMember.findOne({
        userId,
        vendorId: { $ne: null },
        status: 'ACTIVE',
        isDeleted: { $ne: true },
      }).lean()
      hasVendorTeamAccess = !!membership
    } catch {
      hasVendorTeamAccess = false
    }
  }

  if (role !== 'VENDOR' && !hasVendorTeamAccess) {
    redirect('/login')
  }

  // Nav filtering by the member's actual granted access ("based on access
  // that user should get access privileges and accordingly... UI changes"):
  //  - the structural Owner (role === 'VENDOR' login, or VendorProfile
  //    match) and Managers see every item;
  //  - other staff only see items whose module set intersects what the
  //    vendor's Owner/Manager granted them from Team & Access.
  let visibleItems = navItems
  if (role !== 'VENDOR' && userId && membership?.vendorId) {
    try {
      const ownerOrManager = await resolveOwnerOrManagerVendor(userId)
      if (!ownerOrManager) {
        const accessMap = await getVendorStaffAccessMap(
          String(membership.vendorId),
          String(membership.businessId)
        )
        const granted = new Set(accessMap[String(userId).toLowerCase()]?.modules || [])
        visibleItems = navItems.filter((item) => {
          if (item.managerOnly) return false
          if (item.modules === null) return true
          return item.modules.some((m) => granted.has(m))
        })
      }
    } catch {
      // On any resolution error, fail CLOSED for staff: only the always-
      // visible items (Dashboard, Profile) render, never the full menu.
      visibleItems = navItems.filter((item) => item.modules === null && !item.managerOnly)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Brand */}
        <div className="p-5 border-b border-gray-100">
          <p className="text-[10px] uppercase tracking-[0.45em] text-gray-400 mb-1">
            Vendor Portal
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="h-8 w-8 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
                {userName}
              </p>
              <p className="text-[10px] text-gray-500">Vendor Account</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-150 text-sm group"
            >
              <item.icon className="h-4 w-4 flex-shrink-0 group-hover:text-violet-600 transition-colors" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs text-gray-600">Portal Active</p>
            </div>
            <p className="text-[10px] text-gray-400">AN Group Vendor System</p>
          </div>
          <VendorLogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
      <AnuWidget />
      <NotificationBell />
    </div>
  )
}
