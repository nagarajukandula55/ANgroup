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
  ArrowUpDown,
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
  // Needed to post stock movements against the real /api/inventory/movements
  // contract, which requires materialId + warehouseId (not just an item id).
  materialId?: string
  warehouseId?: string
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

  // --- Stock adjustment state -------------------------------------------
  // This whole feature (adjust modal + POST to /api/inventory/movements)
  // used to live only in the orphaned src/app/inventory/page.tsx, a
  // duplicate of this page that was never linked from the sidebar. Rather
  // than leave that functionality stranded in dead code, it's consolidated
  // here into the live page so stock can actually be adjusted from the UI
  // that people can reach. The businessId it needs is resolved the same
  // way the rest of this page already does (via /api/auth/me), not via
  // localStorage like the orphaned version did.
  const [adjustModal, setAdjustModal] = useState<InventoryItem | null>(null)
  const [adjustQty, setAdjustQty] = useState(0)
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [adjustError, setAdjustError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    setError(null)
    try {
      // Resolve the active business the same way every other admin page does
      // (vendors/products/finance) instead of a localStorage key ('an_user')
      // that is never actually written anywhere in the app — that dead
      // lookup meant businessId was always omitted here, and since
      // /api/inventory/items requires it, this page could never load data.
      let businessId: string | null = null
      try {
        const meRes = await fetch('/api/auth/me')
        if (meRes.ok) {
          const meData = await meRes.json()
          businessId = meData.user?.activeBusinessId ?? null
        }
      } catch {
        // ignore — fall back to no explicit businessId
      }

      if (!businessId) {
        setError('No active business selected')
        setItems([])
        return
      }

      // Keep businessId around in state so the stock-adjustment modal
      // (merged in below) can include it on movement POSTs without
      // re-resolving it from /api/auth/me every time.
      setBusinessId(businessId)

      const res = await fetch(`/api/inventory/items?businessId=${businessId}`, {
        headers: { 'x-active-business-id': businessId },
      })
      if (res.ok) {
        const d = await res.json()
        // /api/inventory/items responds with { success, data }, not { items }
        setItems(Array.isArray(d) ? d : (d.data ?? d.items ?? []))
      } else {
        setError('Failed to load inventory')
      }
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  // Posts a stock movement (IN/OUT) for the item currently open in the
  // adjust modal, then refreshes the list so the new quantity is reflected.
  // /api/inventory/movements requires materialId + warehouseId + type +
  // quantity — the orphaned page only ever sent an itemId, which that
  // route doesn't even accept, so this now uses the real contract.
  async function adjustStock() {
    if (!adjustModal) return
    if (!adjustModal.materialId || !adjustModal.warehouseId) {
      setAdjustError('This item is missing material/warehouse info and cannot be adjusted')
      return
    }
    if (!businessId) {
      setAdjustError('No active business selected')
      return
    }

    setAdjustSaving(true)
    setAdjustError(null)
    try {
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-active-business-id': businessId },
        body: JSON.stringify({
          materialId: adjustModal.materialId,
          warehouseId: adjustModal.warehouseId,
          type: adjustQty >= 0 ? 'IN' : 'OUT',
          quantity: Math.abs(adjustQty),
          notes: adjustNote,
          businessId,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setAdjustModal(null)
        setAdjustQty(0)
        setAdjustNote('')
        await fetchItems()
      } else {
        setAdjustError(data.error || 'Failed to adjust stock')
      }
    } catch {
      setAdjustError('Failed to connect')
    } finally {
      setAdjustSaving(false)
    }
  }

  const categories =['ALL', ...Array.from(new Set(items.map((i) => i.category ?? 'Uncategorized').filter(Boolean)))]

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Inventory</h1>
            <p className="text-sm text-gray-400">Stock levels and item management</p>
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
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-sm">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-700" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="flex gap-3 mb-6">
          <Link
            href="/admin/inventory/lots"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
          >
            Lot Management <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/stock-adjustments"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
          >
            Stock Adjustments <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  categoryFilter === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">SKU</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Category</th>
                <th className="text-right px-6 py-3 text-gray-400 font-medium">Qty</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Unit</th>
                <th className="text-right px-6 py-3 text-gray-400 font-medium">Reorder</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    No items found
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const { label, cls } = getStockStatus(item)
                  return (
                    <tr key={item._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-3 text-gray-400 font-mono text-xs">{item.sku ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{item.category ?? '—'}</td>
                      <td className="px-6 py-3 text-right text-gray-900">
                        <button
                          onClick={() => {
                            setAdjustModal(item)
                            setAdjustQty(0)
                            setAdjustNote('')
                            setAdjustError(null)
                          }}
                          className="flex items-center gap-1.5 justify-end w-full hover:text-gray-600 transition"
                          title="Adjust stock"
                        >
                          {item.quantity ?? 0}
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </button>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{item.unit ?? '—'}</td>
                      <td className="px-6 py-3 text-right text-gray-400">{item.reorderLevel ?? 0}</td>
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

      {/* Stock adjustment modal — this is the UI half of the movement-posting
          feature merged in from the orphaned src/app/inventory/page.tsx. The
          state (adjustModal/adjustQty/adjustNote) and the adjustStock() POST
          to /api/inventory/movements already existed above; without this
          modal there was no way to actually open/submit an adjustment, so
          clicking the quantity in the table did nothing. */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-gray-900 font-semibold flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4" /> Adjust Stock
            </h2>
            <p className="text-sm text-gray-500">
              {adjustModal.name} · Current:{' '}
              <strong className="text-gray-900">
                {adjustModal.quantity} {adjustModal.unit ?? ''}
              </strong>
            </p>

            {adjustError && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {adjustError}
              </div>
            )}

            <div>
              <label className="text-xs text-gray-500 block mb-1">Adjustment (+/-)</label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustQty(parseFloat(e.target.value) || 0)}
                placeholder="+50 to add, -10 to remove"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                New total: {Math.max(0, (adjustModal.quantity ?? 0) + adjustQty)} {adjustModal.unit ?? ''}
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Reason / Note</label>
              <input
                value={adjustNote}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustNote(e.target.value)}
                placeholder="Purchase, damage, return..."
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAdjustModal(null)}
                disabled={adjustSaving}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={adjustStock}
                disabled={adjustQty === 0 || adjustSaving}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {adjustSaving ? 'Saving...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
