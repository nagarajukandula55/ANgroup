'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Package,
  AlertTriangle,
  XCircle,
  DollarSign,
  Search,
  ArrowRight,
} from 'lucide-react'

interface InventoryItem {
  _id: string
  name: string
  sku?: string
  category?: string
  quantity: number
  unit?: string
  reorderLevel?: number
  basePrice?: number
  status?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

function getStockStatus(item: InventoryItem): { label: string; cls: string } {
  const qty = item.quantity ?? 0
  const reorder = item.reorderLevel ?? 0
  if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-500/20 text-red-400' }
  if (qty <= reorder) return { label: 'Low Stock', cls: 'bg-yellow-500/20 text-yellow-400' }
  return { label: 'In Stock', cls: 'bg-green-500/20 text-green-400' }
}

export default function InventoryPage() {
  const router = useRouter()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    try {
      let url = '/api/inventory/items'
      try {
        const raw = localStorage.getItem('an_user')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.activeBusinessId) {
            url += `?businessId=${parsed.activeBusinessId}`
          }
        }
      } catch {
        // ignore
      }

      const res = await fetch(url)
      if (res.ok) {
        const d = await res.json()
        setItems(Array.isArray(d) ? d : (d.items ?? []))
      } else {
        setError('Failed to load inventory')
      }
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['ALL', ...Array.from(new Set(items.map((i) => i.category ?? 'Uncategorized').filter(Boolean)))]

  const filtered = items.filter((item) => {
    const matchSearch =
      !search ||
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'ALL' || (item.category ?? 'Uncategorized') === categoryFilter
    return matchSearch && matchCat
  })

  const totalItems = items.length
  const lowStock = items.filter((i) => {
    const qty = i.quantity ?? 0
    const reorder = i.reorderLevel ?? 0
    return qty > 0 && qty <= reorder
  }).length
  const outOfStock = items.filter((i) => (i.quantity ?? 0) === 0).length
  const totalValue = items.reduce((s, i) => s + (i.quantity ?? 0) * (i.basePrice ?? 0), 0)

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
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Inventory</h1>
            <p className="text-sm text-zinc-500">Stock levels and item management</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Package, label: 'Total Items', value: String(totalItems) },
            { icon: AlertTriangle, label: 'Low Stock', value: String(lowStock) },
            { icon: XCircle, label: 'Out of Stock', value: String(outOfStock) },
            { icon: DollarSign, label: 'Total Value', value: fmt(totalValue) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-400 text-sm">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-zinc-300" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="flex gap-3 mb-6">
          <Link
            href="/admin/inventory/lots"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.04] text-sm text-zinc-400 hover:text-white hover:bg-white/[0.07] transition"
          >
            Lot Management <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/stock-adjustments"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.06] bg-white/[0.04] text-sm text-zinc-400 hover:text-white hover:bg-white/[0.07] transition"
          >
            Stock Adjustments <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search items, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  categoryFilter === cat
                    ? 'bg-white text-black'
                    : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">SKU</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Category</th>
                <th className="text-right px-6 py-3 text-zinc-500 font-medium">Qty</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Unit</th>
                <th className="text-right px-6 py-3 text-zinc-500 font-medium">Reorder</th>
                <th className="text-center px-6 py-3 text-zinc-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-zinc-500">
                    No items found
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const { label, cls } = getStockStatus(item)
                  return (
                    <tr key={item._id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-3 font-medium text-white">{item.name}</td>
                      <td className="px-6 py-3 text-zinc-500 font-mono text-xs">{item.sku ?? '—'}</td>
                      <td className="px-6 py-3 text-zinc-400">{item.category ?? '—'}</td>
                      <td className="px-6 py-3 text-right text-white">{item.quantity ?? 0}</td>
                      <td className="px-6 py-3 text-zinc-400">{item.unit ?? '—'}</td>
                      <td className="px-6 py-3 text-right text-zinc-500">{item.reorderLevel ?? 0}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
                          {label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
