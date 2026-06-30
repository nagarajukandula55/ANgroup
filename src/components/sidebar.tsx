'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, ShoppingCart, Users, Package,
  BarChart3, DollarSign, Truck, Settings, Bell, MessageSquare,
  FileText, ChevronRight, Menu, X, LogOut, ChevronDown,
  Briefcase, Shield, Bot, Hash, Globe, ClipboardList, UserCheck, Layers,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    group: 'Platform',
    items: [
      { key: 'home', label: 'Dashboard', route: '/', icon: <LayoutDashboard size={16} /> },
      { key: 'businesses', label: 'Businesses', route: '/businesses', icon: <Building2 size={16} /> },
      { key: 'analytics', label: 'Analytics', route: '/analytics', icon: <BarChart3 size={16} /> },
    ],
  },
  {
    group: 'ERP',
    items: [
      { key: 'inventory', label: 'Inventory', route: '/erp/inventory', icon: <Package size={16} /> },
      { key: 'purchase', label: 'Purchase', route: '/erp/purchase', icon: <ClipboardList size={16} /> },
      { key: 'sales', label: 'Sales', route: '/erp/sales', icon: <ShoppingCart size={16} /> },
      { key: 'finance', label: 'Finance', route: '/finance', icon: <DollarSign size={16} /> },
      { key: 'hr', label: 'HR & Payroll', route: '/employees', icon: <UserCheck size={16} /> },
      { key: 'crm', label: 'CRM', route: '/erp/crm', icon: <Users size={16} /> },
      { key: 'logistics', label: 'Logistics', route: '/logistics', icon: <Truck size={16} /> },
    ],
  },
  {
    group: 'Documents',
    items: [
      { key: 'documents', label: 'Documents', route: '/documents', icon: <FileText size={16} /> },
      { key: 'agreements', label: 'Agreements', route: '/documents/agreements', icon: <Layers size={16} /> },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { key: 'chat', label: 'Internal Chat', route: '/chat', icon: <MessageSquare size={16} /> },
      { key: 'ai', label: 'AI Assistant', route: '/ai', icon: <Bot size={16} /> },
      { key: 'notifications', label: 'Notifications', route: '/notifications', icon: <Bell size={16} /> },
    ],
  },
  {
    group: 'Admin',
    items: [
      { key: 'admin', label: 'Admin Panel', route: '/admin', icon: <Shield size={16} /> },
      { key: 'users', label: 'Users', route: '/admin/users', icon: <Users size={16} /> },
      { key: 'roles', label: 'Roles & Perms', route: '/admin/roles', icon: <Hash size={16} /> },
      { key: 'sso', label: 'SSO Settings', route: '/admin/sso', icon: <Globe size={16} /> },
      { key: 'settings', label: 'Settings', route: '/settings', icon: <Settings size={16} /> },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [businesses, setBusinesses] = useState<any[]>([])
  const [currentBusiness, setCurrentBusiness] = useState<any>(null)
  const [showBizPicker, setShowBizPicker] = useState(false)

  useEffect(() => { loadUser() }, [])

  async function loadUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
        setBusinesses(data.businesses || [])
        if (data.businesses?.length) {
          const saved = localStorage.getItem('an_biz')
          setCurrentBusiness(data.businesses.find((b: any) => b._id === saved) || data.businesses[0])
        }
      }
    } catch {}
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    localStorage.clear()
    router.push('/login')
  }

  function selectBiz(biz: any) {
    setCurrentBusiness(biz)
    localStorage.setItem('an_biz', biz._id)
    setShowBizPicker(false)
    router.refresh()
  }

  const active = (route: string) => route === '/' ? pathname === '/' : pathname.startsWith(route)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-white/10 bg-black/80 p-2.5 backdrop-blur-xl lg:hidden"
      >
        {open ? <X size={18} className="text-white" /> : <Menu size={18} className="text-white" />}
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/70 lg:hidden" />
      )}

      <aside
        className={`fixed lg:relative z-50 h-screen w-64 flex-shrink-0 border-r border-white/[0.06] bg-black transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="border-b border-white/[0.06] px-5 py-4">
            <p className="text-[9px] uppercase tracking-[0.5em] text-zinc-600">Enterprise</p>
            <h2 className="mt-1 text-lg font-bold text-white">AN Group</h2>
            <p className="text-[10px] text-zinc-500">Parent Company Portal</p>
          </div>

          {/* Business switcher */}
          {businesses.length > 0 && (
            <div className="border-b border-white/[0.06] px-3 py-3">
              <button
                onClick={() => setShowBizPicker(!showBizPicker)}
                className="w-full flex items-center gap-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] px-3 py-2 transition-all text-left"
              >
                <Briefcase size={13} className="text-zinc-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{currentBusiness?.name || 'Select Business'}</p>
                  <p className="text-[10px] text-zinc-500">{currentBusiness?.businessCode || '—'}</p>
                </div>
                <ChevronDown size={11} className={`text-zinc-600 transition-transform ${showBizPicker ? 'rotate-180' : ''}`} />
              </button>

              {showBizPicker && (
                <div className="mt-2 rounded-xl border border-white/10 bg-zinc-950 overflow-hidden">
                  {businesses.map(biz => (
                    <button
                      key={biz._id}
                      onClick={() => selectBiz(biz)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] transition-all text-left ${currentBusiness?._id === biz._id ? 'bg-white/[0.04]' : ''}`}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-white">{biz.name}</p>
                        <p className="text-[10px] text-zinc-500">{biz.businessCode}</p>
                      </div>
                    </button>
                  ))}
                  <Link href="/businesses/create" onClick={() => setShowBizPicker(false)}
                    className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.06] text-[11px] text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-all">
                    + Add Business
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {NAV_GROUPS.map(group => (
              <div key={group.group}>
                <p className="px-2 mb-1 text-[9px] uppercase tracking-[0.4em] text-zinc-700 font-semibold">{group.group}</p>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const isActive = active(item.route)
                    return (
                      <Link
                        key={item.key}
                        href={item.route}
                        onClick={() => setOpen(false)}
                        className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-all ${
                          isActive
                            ? 'bg-white text-black font-semibold'
                            : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        <span className={isActive ? 'text-black' : 'text-zinc-600 group-hover:text-zinc-300'}>{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight size={11} className="text-black/30" />}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User footer */}
          <div className="border-t border-white/[0.06] px-4 py-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-zinc-500">{user.isSuperAdmin ? 'Super Admin' : user.role}</p>
                </div>
                <button onClick={handleLogout} title="Sign out"
                  className="p-1.5 rounded-lg text-zinc-600 hover:bg-red-500/10 hover:text-red-400 transition-all">
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white">
                <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center">
                  <Users size={13} />
                </div>
                Sign In
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
