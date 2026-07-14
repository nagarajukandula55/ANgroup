'use client'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout'
import { ShoppingBag, Plus, Search, TrendingUp } from 'lucide-react'

export default function SalesPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, revenue: '₹0', pending: 0 })

  useEffect(() => {
    fetch('/api/sales/orders', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setOrders(data.orders || [])
          const revenue = (data.orders || []).reduce((s: number, o: any) => s + (o.totalAmount || 0), 0)
          setStats({ total: data.orders?.length || 0, revenue: `₹${revenue.toLocaleString()}`, pending: (data.orders || []).filter((o: any) => o.status === 'PENDING').length })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = orders.filter(o =>
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor: Record<string, string> = {
    PENDING: 'badge-pending', CONFIRMED: 'badge-active', DELIVERED: 'badge-active',
    CANCELLED: 'badge-inactive', PROCESSING: 'badge-info'
  }

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">ERP</p>
            <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          </div>
          <button className="btn-primary rounded-xl px-4 py-2 text-sm flex items-center gap-2">
            <Plus size={14} /> New Order
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Orders', value: stats.total, icon: <ShoppingBag size={14} /> },
            { label: 'Revenue', value: stats.revenue, icon: <TrendingUp size={14} /> },
            { label: 'Pending', value: stats.pending, icon: <ShoppingBag size={14} /> },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
            <Search size={14} className="text-gray-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by order number or customer..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none" />
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-600 text-sm">Loading sales orders…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">No sales orders found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Order#', 'Customer', 'Date', 'Amount', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-mono text-gray-900">{o.orderNumber}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{o.customer?.name || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">₹{(o.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3"><span className={`badge ${statusColor[o.status] || 'badge-info'}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}
