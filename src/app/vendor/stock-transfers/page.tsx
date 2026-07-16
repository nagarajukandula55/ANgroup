'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ArrowLeftRight } from 'lucide-react'

interface Transfer {
  _id: string
  transferNumber: string
  fromWarehouse: string
  toWarehouse: string
  status: string
  createdAt: string
}

interface Warehouse {
  _id: string
  warehouseName: string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  IN_TRANSIT: 'bg-amber-500/10 text-amber-700',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Vendor's own view of Stock Transfers touching their own warehouses (see
// /admin/stock-transfers) -- reuses the exact same /api/stock/transfers
// endpoint. StockTransfer has no vendorId of its own (it's warehouse-to-
// warehouse), so this scopes by "either side is one of MY warehouses"
// instead, fed by the same /api/warehouses list the vendor's own
// Warehouses page (/vendor/warehouses) already uses.
export default function VendorStockTransfersPage() {
  const router = useRouter()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [warehouseNames, setWarehouseNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [warehouseIds, setWarehouseIds] = useState<string[]>([])

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('/api/auth/me')
        const meData = await meRes.json()
        const bId = meData.user?.activeBusinessId ?? null
        setBusinessId(bId)

        const whRes = await fetch('/api/warehouses')
        const whData = await whRes.json()
        const warehouses: Warehouse[] = whData.warehouses || whData.data || []
        setWarehouseIds(warehouses.map((w) => w._id))
        setWarehouseNames(Object.fromEntries(warehouses.map((w) => [w._id, w.warehouseName])))
      } catch {}
    }
    init()
  }, [])

  const fetchTransfers = useCallback(async () => {
    if (!businessId || warehouseIds.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/stock/transfers?businessId=${businessId}&warehouseIn=${warehouseIds.join(',')}`)
      const d = await res.json()
      if (!res.ok || d.error) throw new Error(d.error || 'Failed to load stock transfers')
      setTransfers(d.transfers || d.data || [])
    } catch (err: any) {
      setError(err.message || 'Could not load stock transfers')
      setTransfers([])
    } finally {
      setLoading(false)
    }
  }, [businessId, warehouseIds])

  useEffect(() => { fetchTransfers() }, [fetchTransfers])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/vendor')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Stock Transfers</h1>
            <p className="text-sm text-gray-400">Transfers between your own warehouses</p>
          </div>
        </div>

        {error && <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Transfer #</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">From</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">To</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    <ArrowLeftRight className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                    No stock transfers found
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{t.transferNumber}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">{warehouseNames[t.fromWarehouse] || t.fromWarehouse}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">{warehouseNames[t.toWarehouse] || t.toWarehouse}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400">{fmtDate(t.createdAt)}</td>
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
