'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ShoppingCart } from 'lucide-react'

interface PO {
  _id: string
  poNumber: string
  status: string
  totalAmount: number
  expectedDate?: string
  createdAt: string
  warehouseId?: { warehouseName?: string } | string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  APPROVED: 'bg-emerald-500/10 text-emerald-700',
  REJECTED: 'bg-red-500/10 text-red-700',
  REVISION_REQUIRED: 'bg-amber-500/10 text-amber-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
  RECEIVED: 'bg-cyan-500/10 text-cyan-700',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Vendor's own read-only view of Purchase Orders placed WITH them by the
// business (see /admin/purchase-orders) -- reuses the exact same
// /api/purchase-orders endpoint, scoped to just this vendor's own orders
// via the vendorId query param (PurchaseOrder already carries vendorId
// natively, unlike CrmCall/CrmJobSheet -- no assignedTo-set workaround
// needed here). Read-only: the business is the one who creates/approves
// these, a vendor's role here is to see and fulfill them, not author them.
export default function VendorPurchasePage() {
  const router = useRouter()
  const [orders, setOrders] = useState<PO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vendorId, setVendorId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/vendor/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?._id) setVendorId(d.data._id)
      })
      .catch(() => {})
  }, [])

  const fetchOrders = useCallback(async () => {
    if (!vendorId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/purchase-orders?vendorId=${vendorId}`)
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to load purchase orders')
      setOrders(d.data || [])
    } catch (err: any) {
      setError(err.message || 'Could not load purchase orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/vendor')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Purchase Orders</h1>
            <p className="text-sm text-gray-400">Orders placed with you by the business</p>
          </div>
        </div>

        {error && <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">PO #</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Warehouse</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-6 py-3 text-gray-400 font-medium">Amount</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Expected</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{po.poNumber}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {typeof po.warehouseId === 'object' ? po.warehouseId?.warehouseName : '—'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {po.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium">{fmt(po.totalAmount)}</td>
                    <td className="px-6 py-3 text-gray-400">{fmtDate(po.expectedDate)}</td>
                    <td className="px-6 py-3 text-gray-400">{fmtDate(po.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
