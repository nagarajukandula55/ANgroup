'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Loader2,
  TrendingUp,
  ShoppingCart,
  FileText,
  Clock,
  Package,
  Truck,
  BarChart3,
  ArrowRight,
} from 'lucide-react'

interface Invoice {
  _id: string
  invoiceNumber: string
  customerName: string
  totalAmount: number
  status: string
  createdAt: string
}

interface Order {
  _id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  status: string
  createdAt: string
}

interface UserData {
  name: string
  email: string
}

const statusColors: Record<string, string> = {
  PAID: 'bg-green-500/20 text-green-400',
  DRAFT: 'bg-zinc-500/20 text-zinc-400',
  SENT: 'bg-blue-500/20 text-blue-400',
  OVERDUE: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-yellow-500/20 text-yellow-400',
  SHIPPED: 'bg-purple-500/20 text-purple-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-sm">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
          <Icon className="w-4 h-4 text-zinc-300" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [invRes, ordRes, userRes] = await Promise.all([
          fetch('/api/sales/invoices'),
          fetch('/api/sales/orders'),
          fetch('/api/auth/me'),
        ])

        if (invRes.ok) {
          const data = await invRes.json()
          setInvoices(Array.isArray(data) ? data : (data.invoices ?? []))
        }
        if (ordRes.ok) {
          const data = await ordRes.json()
          setOrders(Array.isArray(data) ? data : (data.orders ?? []))
        }
        if (userRes.ok) {
          const data = await userRes.json()
          setUser(data.user ?? data)
        }
      } catch {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const totalRevenue = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + (i.totalAmount ?? 0), 0)

  const pendingAmount = invoices
    .filter((i) => ['SENT', 'OVERDUE', 'DRAFT'].includes(i.status))
    .reduce((s, i) => s + (i.totalAmount ?? 0), 0)

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <p className="text-zinc-500 text-sm mb-1">{today}</p>
          <h1 className="text-3xl font-semibold">
            {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          {error && (
            <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 inline-block">
              {error}
            </p>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={TrendingUp} label="Total Revenue" value={fmt(totalRevenue)} sub="From paid invoices" />
          <StatCard icon={ShoppingCart} label="Total Orders" value={String(orders.length)} sub="All time" />
          <StatCard icon={FileText} label="Total Invoices" value={String(invoices.length)} sub="All time" />
          <StatCard icon={Clock} label="Pending Amount" value={fmt(pendingAmount)} sub="Unpaid invoices" />
        </div>

        {/* Recent Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Recent Invoices */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-medium text-white">Recent Invoices</h2>
              <Link
                href="/admin/sales"
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {recentInvoices.length === 0 ? (
                <p className="px-6 py-8 text-zinc-500 text-sm text-center">No invoices yet</p>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv._id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{inv.invoiceNumber}</p>
                      <p className="text-xs text-zinc-500">{inv.customerName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white">{fmt(inv.totalAmount)}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inv.status] ?? 'bg-zinc-500/20 text-zinc-400'}`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-medium text-white">Recent Orders</h2>
              <Link
                href="/admin/orders"
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {recentOrders.length === 0 ? (
                <p className="px-6 py-8 text-zinc-500 text-sm text-center">No orders yet</p>
              ) : (
                recentOrders.map((ord) => (
                  <div key={ord._id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{ord.orderNumber}</p>
                      <p className="text-xs text-zinc-500">{ord.customerName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-white">{fmt(ord.totalAmount)}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ord.status] ?? 'bg-zinc-500/20 text-zinc-400'}`}
                      >
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-medium text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/admin/orders', icon: ShoppingCart, label: 'Orders', desc: 'Manage customer orders' },
            { href: '/admin/products', icon: Package, label: 'Products', desc: 'Manage product catalog' },
            { href: '/admin/vendors', icon: Truck, label: 'Vendors', desc: 'Vendor onboarding' },
            { href: '/admin/inventory', icon: BarChart3, label: 'Inventory', desc: 'Stock management' },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 hover:bg-white/[0.07] transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-zinc-300" />
              </div>
              <p className="font-medium text-white mb-1">{label}</p>
              <p className="text-xs text-zinc-500">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
