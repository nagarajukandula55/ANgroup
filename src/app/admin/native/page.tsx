'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Package,
  ShoppingCart,
  BarChart3,
  Truck,
  Hash,
  ArrowRight,
} from 'lucide-react'

interface NativeStats {
  products: number
  orders: number
  inventory: number
  vendors: number
  loadingProducts: boolean
  loadingOrders: boolean
  loadingInventory: boolean
  loadingVendors: boolean
}

export default function NativePage() {
  const router = useRouter()
  const [stats, setStats] = useState<NativeStats>({
    products: 0,
    orders: 0,
    inventory: 0,
    vendors: 0,
    loadingProducts: true,
    loadingOrders: true,
    loadingInventory: true,
    loadingVendors: true,
  })

  useEffect(() => {
    async function fetchStats() {
      // Products / Inventory items
      fetch('/api/inventory/items')
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d) {
            const arr = Array.isArray(d) ? d : (d.items ?? [])
            setStats((p) => ({ ...p, products: arr.length, inventory: arr.length, loadingProducts: false, loadingInventory: false }))
          } else {
            setStats((p) => ({ ...p, loadingProducts: false, loadingInventory: false }))
          }
        })
        .catch(() => setStats((p) => ({ ...p, loadingProducts: false, loadingInventory: false })))

      // Orders
      fetch('/api/sales/orders')
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d) {
            const arr = Array.isArray(d) ? d : (d.orders ?? [])
            setStats((p) => ({ ...p, orders: arr.length, loadingOrders: false }))
          } else {
            setStats((p) => ({ ...p, loadingOrders: false }))
          }
        })
        .catch(() => setStats((p) => ({ ...p, loadingOrders: false })))

      // Vendors
      fetch('/api/vendors')
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d) {
            const arr = Array.isArray(d) ? d : (d.vendors ?? [])
            setStats((p) => ({ ...p, vendors: arr.length, loadingVendors: false }))
          } else {
            setStats((p) => ({ ...p, loadingVendors: false }))
          }
        })
        .catch(() => setStats((p) => ({ ...p, loadingVendors: false })))
    }

    fetchStats()
  }, [])

  const sections = [
    {
      href: '/admin/products',
      icon: Package,
      title: 'Products',
      description: 'Manage your product catalog, pricing, tax rates, and stock levels.',
      stat: stats.products,
      statLabel: 'products',
      loading: stats.loadingProducts,
    },
    {
      href: '/admin/orders',
      icon: ShoppingCart,
      title: 'Orders',
      description: 'Track and manage customer orders from placement to delivery.',
      stat: stats.orders,
      statLabel: 'orders',
      loading: stats.loadingOrders,
    },
    {
      href: '/admin/inventory',
      icon: BarChart3,
      title: 'Inventory',
      description: 'Monitor stock levels, lot management, and trigger reorder alerts.',
      stat: stats.inventory,
      statLabel: 'items in stock',
      loading: stats.loadingInventory,
    },
    {
      href: '/admin/vendors',
      icon: Truck,
      title: 'Vendors',
      description: 'Onboard and approve suppliers. Manage vendor profiles and ratings.',
      stat: stats.vendors,
      statLabel: 'vendors',
      loading: stats.loadingVendors,
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Native Store</h1>
            <p className="text-sm text-zinc-500">Ecommerce business management</p>
          </div>
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {sections.map(({ href, icon: Icon, title, description, stat, statLabel, loading }) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 hover:bg-white/[0.07] transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-white/[0.08] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-zinc-300" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition" />
              </div>
              <h3 className="font-medium text-white mb-1">{title}</h3>
              <p className="text-sm text-zinc-500 mb-4">{description}</p>
              <div className="flex items-center gap-2">
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 text-zinc-600 animate-spin" />
                ) : (
                  <>
                    <span className="text-xl font-semibold text-white">{stat}</span>
                    <span className="text-sm text-zinc-500">{statLabel}</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Document Numbers Quick Link */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                <Hash className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <p className="font-medium text-white">Document Series</p>
                <p className="text-sm text-zinc-500">Configure invoice, order, and PO numbering sequences</p>
              </div>
            </div>
            <Link
              href="/admin/document-numbers"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.04] text-sm text-zinc-400 hover:text-white hover:bg-white/[0.08] transition"
            >
              Configure <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
