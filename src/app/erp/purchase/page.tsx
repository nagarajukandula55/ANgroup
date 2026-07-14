'use client'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout'
import { ShoppingCart, Plus, Search, Eye, Check, X } from 'lucide-react'
import Link from 'next/link'

export default function PurchasePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    try {
      const res = await fetch('/api/purchase/orders', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setOrders(data.orders || [])
    } catch {}
    setLoading(false)
  }

  const filtered = orders.filter(o =>
    o.poNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.vendor?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor: Record<string, string> = {
    DRAFT: 'badge-pending', PENDING: 'badge-pending', APPROVED: 'badge-active',
    RECEIVED: 'badge-active', CANCELLED: 'badge-inactive', CLOSED: 'badge-info'
  }

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">ERP</p>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          </div>
          <Link href="/admin/purchase-orders/new" className="btn-primary rounded-xl px-4 py-2 text-sm flex items-center gap-2">
            <Plus size={14} /> New PO
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Orders', value: orders.length },
            { label: 'Pending Approval', value: orders.filter(o => o.status === 'PENDING').length },
            { label: 'Received This Month', value: orders.filter(o => o.status === 'RECEIVED').length },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
            <Search size={14} className="text-gray-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by PO number or vendor..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none" />
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-600 text-sm">Loading purchase orders…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingCart size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">No purchase orders found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['PO Number', 'Vendor', 'Date', 'Amount', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-mono text-gray-900">{o.poNumber}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{o.vendor?.name || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-900">₹{(o.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3"><span className={`badge ${statusColor[o.status] || 'badge-info'}`}>{o.status}</span></td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/purchase-orders/${o._id}`} className="text-gray-500 hover:text-gray-900 transition-all">
                        <Eye size={14} />
                      </Link>
                    </td>
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
