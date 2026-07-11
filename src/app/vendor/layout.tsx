import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import VendorLogoutButton from '@/components/vendor/VendorLogoutButton'
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
} from 'lucide-react'

// NOTE: Bill of Materials is intentionally NOT a top-level nav item — BOM
// is per-product (see /vendor/products/[id]/bom, already built and wired
// from each product's own detail page), not a flat vendor-wide list, so it
// belongs inside "My Products" rather than getting its own nav entry.
const navItems = [
  { href: '/vendor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/products', label: 'My Products', icon: Package },
  { href: '/vendor/inventory', label: 'Inventory', icon: Boxes },
  { href: '/vendor/orders', label: 'My Orders', icon: ShoppingCart },
  { href: '/vendor/offline-sales', label: 'Offline Sales', icon: ShoppingBag },
  { href: '/vendor/warehouses', label: 'Warehouses', icon: Warehouse },
  { href: '/vendor/staff', label: 'Staff', icon: Users },
  { href: '/vendor/invoices', label: 'Invoices & Payments', icon: FileText },
  { href: '/vendor/payouts', label: 'Payout Settings', icon: Wallet },
  { href: '/vendor/profile', label: 'My Profile', icon: User },
  { href: '/vendor/statement', label: 'Financial Statement', icon: BarChart3 },
]

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const role = headersList.get('x-user-role')
  const userName = headersList.get('x-user-name') || 'Vendor'

  if (role !== 'VENDOR') {
    redirect('/login')
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
          {navItems.map((item) => (
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
    </div>
  )
}
