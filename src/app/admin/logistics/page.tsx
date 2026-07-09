'use client'

import { useEffect, useState } from 'react'
import { Truck, MapPin, Package, Clock, RefreshCw } from 'lucide-react'

/**
 * MOVED from src/app/logistics/page.tsx (orphaned root-level route, not
 * reachable from the live sidebar, and previously rendered nothing but
 * hardcoded numbers) to src/app/admin/logistics — the conventional
 * location for admin features. Now wired to the real /api/logistics/overview
 * route, which reads shipment data from Order.shipping (the actual live
 * schema — there's no separate Shipment model in this codebase; see that
 * route's comments for detail). "Delivery Zones" from the original mock UI
 * has no real backing concept in the schema (no region/zone field
 * anywhere), so it's replaced with "Courier Partners" (a real, honestly
 * computed count) rather than continuing to show a fabricated number.
 */
export default function LogisticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/logistics/overview', { credentials: 'include' })
      const d = await res.json()
      if (d.success) {
        setData(d)
      } else {
        setError(d.error || 'Failed to load logistics data')
      }
    } catch {
      setError('Failed to load logistics data')
    }
    setLoading(false)
  }

  const stats = data ? [
    { title: 'Active Shipments', value: String(data.activeShipments ?? 0), icon: Truck },
    { title: 'Warehouses', value: String(data.warehouseCount ?? 0), icon: Package },
    { title: 'Courier Partners', value: String(data.courierPartnersInUse ?? 0), icon: MapPin },
    { title: 'Avg Delivery', value: data.avgDeliveryDays !== null ? `${data.avgDeliveryDays}d` : '—', icon: Clock },
  ] : []

  return (
      <div className="space-y-8">
        <section className="rounded-[40px] border border-white/10 bg-white/5 p-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-cyan-300 text-sm">
                SUPPLY CHAIN CONTROL
              </p>
              <h1 className="mt-5 text-6xl font-black">
                Logistics Network
              </h1>
              <p className="mt-6 text-lg max-w-3xl text-slate-300">
                Track shipments, warehouse coverage, and delivery performance across every order.
              </p>
            </div>
            <button onClick={load} className="rounded-full border border-white/10 p-3 text-slate-300 hover:text-white transition-all">
              <RefreshCw size={18} />
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-300">Loading logistics data…</div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {stats.map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={index} className="rounded-[32px] border border-white/10 bg-white/5 p-8">
                    <Icon size={36} className="text-cyan-300" />
                    <h2 className="mt-5 text-xl font-bold">{item.title}</h2>
                    <h3 className="mt-5 text-5xl font-black">{item.value}</h3>
                  </div>
                )
              })}
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
              <h3 className="text-xl font-bold mb-6">Recent Shipments</h3>
              {(data?.recentShipments || []).length === 0 ? (
                <p className="text-slate-400 text-sm">No shipments created yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentShipments.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                      <div>
                        <p className="font-semibold">{s.invoiceNumber || s.orderId}</p>
                        <p className="text-xs text-slate-400">{s.courierPartner || 'Courier not assigned'} {s.awbNumber ? `· AWB ${s.awbNumber}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-cyan-300">{s.trackingStatus || 'Pending'}</p>
                        {s.trackingUrl && (
                          <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="text-xs underline text-slate-400 hover:text-white">
                            Track
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
  )
}
