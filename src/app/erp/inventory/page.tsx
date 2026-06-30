'use client'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout'
import { Package, TrendingDown, AlertTriangle, RefreshCw, Search, Plus, Filter } from 'lucide-react'

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0, value: '₹0' })

  useEffect(() => { loadInventory() }, [])

  async function loadInventory() {
    try {
      const res = await fetch('/api/inventory/items', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setItems(data.items || [])
        setStats(data.stats || stats)
      }
    } catch {}
    setLoading(false)
  }

  const filtered = items.filter(item =>
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.sku?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">ERP</p>
            <h1 className="text-2xl font-bold text-white">Inventory</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadInventory} className="rounded-xl border border-white/10 p-2 text-zinc-400 hover:text-white transition-all">
              <RefreshCw size={14} />
            </button>
            <button className="btn-primary rounded-xl px-4 py-2 text-sm flex items-center gap-2">
              <Plus size={14} /> Add Item
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Items', value: stats.total || items.length, icon: <Package size={14} />, color: 'text-white' },
            { label: 'Low Stock', value: stats.lowStock || 0, icon: <TrendingDown size={14} />, color: 'text-yellow-400' },
            { label: 'Out of Stock', value: stats.outOfStock || 0, icon: <AlertTriangle size={14} />, color: 'text-red-400' },
            { label: 'Total Value', value: stats.value || '₹0', icon: <Package size={14} />, color: 'text-green-400' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className={`flex items-center gap-2 ${s.color}`}>
                {s.icon}
                <span className="text-xs text-zinc-500">{s.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search and table */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <Search size={14} className="text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search inventory items..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none border-none"
            />
            <button className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-all">
              <Filter size={12} /> Filter
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-zinc-600 text-sm">Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">No inventory items found</p>
              <p className="text-xs text-zinc-700 mt-1">Add items via the Admin panel or import from CSV</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">Item</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">SKU</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">Qty</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">Unit</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">Value</th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-all">
                      <td className="px-5 py-3 text-sm text-white font-medium">{item.name}</td>
                      <td className="px-5 py-3 text-xs text-zinc-400 font-mono">{item.sku || '—'}</td>
                      <td className="px-5 py-3 text-sm text-white">{item.quantity || item.qty || 0}</td>
                      <td className="px-5 py-3 text-xs text-zinc-400">{item.unit || 'pcs'}</td>
                      <td className="px-5 py-3 text-sm text-white">₹{(item.value || 0).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className={`badge ${item.quantity > 10 ? 'badge-active' : item.quantity > 0 ? 'badge-pending' : 'badge-inactive'}`}>
                          {item.quantity > 10 ? 'In Stock' : item.quantity > 0 ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
