import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  User,
  BarChart3,
  Building2,
} from 'lucide-react'

const navItems = [
  { href: '/vendor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vendor/products', label: 'My Products', icon: Package },
  { href: '/vendor/orders', label: 'My Orders', icon: ShoppingCart },
  { href: '/vendor/invoices', label: 'Invoices & Payments', icon: FileText },
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
    <div className="flex min-h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-zinc-950 border-r border-white/[0.06] flex flex-col">
        {/* Brand */}
        <div className="p-5 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-[0.45em] text-zinc-600 mb-1">
            Vendor Portal
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="h-8 w-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white truncate max-w-[140px]">
                {userName}
              </p>
              <p className="text-[10px] text-zinc-500">Vendor Account</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200 transition-all duration-150 text-sm group"
            >
              <item.icon className="h-4 w-4 flex-shrink-0 group-hover:text-violet-400 transition-colors" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs text-zinc-400">Portal Active</p>
            </div>
            <p className="text-[10px] text-zinc-600">AN Group Vendor System</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}
