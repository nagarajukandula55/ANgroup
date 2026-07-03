'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, TrendingUp, ShoppingCart, FileText, Clock, Package, Truck, BarChart3, ArrowRight } from 'lucide-react'

interface Invoice { _id: string; invoiceNumber: string; customerName: string; totalAmount: number; status: string; createdAt: string }
interface Order   { _id: string; orderNumber: string;  customerName: string; totalAmount: number; status: string; createdAt: string }
interface UserData { name: string; email: string }

const STATUS_COLORS: Record<string, string> = {
  PAID:       'bg-green-50 text-green-700',
  DRAFT:      'bg-gray-100 text-gray-600',
  SENT:       'bg-blue-50 text-blue-700',
  OVERDUE:    'bg-red-50 text-red-700',
  CANCELLED:  'bg-red-50 text-red-700',
  CONFIRMED:  'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-yellow-50 text-yellow-700',
  SHIPPED:    'bg-purple-50 text-purple-700',
  DELIVERED:  'bg-green-50 text-green-700',
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent || 'bg-gray-100'}`}>
          <Icon className="w-4 h-4 text-gray-600" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [orders, setOrders]     = useState<Order[]>([])
  const [user, setUser]         = useState<UserData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

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
      } catch { setError('Failed to load dashboard data') }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  const totalRevenue  = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.totalAmount ?? 0), 0)
  const pendingAmount = invoices.filter(i => ['SENT','OVERDUE','DRAFT'].includes(i.status)).reduce((s, i) => s + (i.totalAmount ?? 0), 0)
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  const recentOrders  = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const fmt   = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-gray-400 mb-1">{today}</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {user ? `Welcome back, ${user.name.split(' ')[0]} 👋` : 'Dashboard'}
          </h1>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2 inline-block">{error}</p>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={TrendingUp}  label="Total Revenue"   value={fmt(totalRevenue)}    sub="From paid invoices"  accent="bg-green-100" />
          <StatCard icon={ShoppingCart} label="Total Orders"   value={String(orders.length)} sub="All time"            accent="bg-blue-100" />
          <StatCard icon={FileText}    label="Total Invoices"  value={String(invoices.length)} sub="All time"          accent="bg-purple-100" />
          <StatCard icon={Clock}       label="Pending Amount"  value={fmt(pendingAmount)}   sub="Unpaid invoices"     accent="bg-orange-100" />
        </div>

        {/* Recent Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Invoices */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Recent Invoices</h2>
              <Link href="/admin/sales" className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentInvoices.length === 0 ? (
                <p className="px-5 py-8 text-gray-400 text-sm text-center">No invoices yet</p>
              ) : recentInvoices.map(inv => (
                <div key={inv._id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{inv.customerName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{fmt(inv.totalAmount)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
              <Link href="/admin/orders" className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentOrders.length === 0 ? (
                <p className="px-5 py-8 text-gray-400 text-sm text-center">No orders yet</p>
              ) : recentOrders.map(ord => (
                <div key={ord._id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ord.orderNumber}</p>
                    <p className="text-xs text-gray-400">{ord.customerName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{fmt(ord.totalAmount)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ord.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/admin/orders',    icon: ShoppingCart, label: 'Orders',    desc: 'Manage customer orders' },
            { href: '/admin/products',  icon: Package,      label: 'Products',  desc: 'Manage product catalog' },
            { href: '/admin/vendors',   icon: Truck,        label: 'Vendors',   desc: 'Vendor onboarding' },
            { href: '/admin/inventory', icon: BarChart3,    label: 'Inventory', desc: 'Stock management' },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-gray-300 transition group">
              <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-gray-900 flex items-center justify-center mb-4 transition">
                <Icon className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
              </div>
              <p className="font-semibold text-gray-900 mb-1 text-sm">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
