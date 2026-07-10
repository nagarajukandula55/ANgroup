'use client'

import { useEffect, useState, useCallback } from 'react'
import { Truck, MapPin, Package, Clock, RefreshCw, Plug, Search } from 'lucide-react'

const SUPPORTED_COURIERS: { key: string; label: string }[] = [
  { key: 'SHIPROCKET', label: 'Shiprocket' },
  { key: 'DELHIVERY', label: 'Delhivery' },
  { key: 'BLUEDART', label: 'Bluedart' },
  { key: 'XPRESSBEES', label: 'Xpressbees' },
  { key: 'ECOM_EXPRESS', label: 'Ecom Express' },
]

interface CourierIntegrationState {
  isActive: boolean
  configured: boolean
  credentials: Record<string, string>
}

interface RateQuote {
  provider: string
  courierId: string
  courierName: string
  rate: number
  etaDays?: number | null
}

/**
 * Courier Providers panel: shows every supported courier (Shiprocket is the
 * only one with a live integration today — the rest are pluggable stubs
 * that surface a clear "not configured" error until real credentials are
 * added, per the framework-building scope of this feature). Reuses the
 * existing generic /api/integrations endpoints (Integration model now
 * accepts courier provider keys too) rather than new CRUD routes.
 */
function CourierProvidersPanel({ businessId }: { businessId: string | null }) {
  const [states, setStates] = useState<Record<string, CourierIntegrationState>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!businessId) return
    try {
      const res = await fetch('/api/integrations', { headers: { 'x-active-business-id': businessId } })
      if (!res.ok) return
      const { integrations } = await res.json()
      const next: Record<string, CourierIntegrationState> = {}
      for (const c of SUPPORTED_COURIERS) {
        const found = (integrations || []).find((i: any) => i.provider === c.key)
        next[c.key] = {
          isActive: !!found?.isActive,
          configured: !!found,
          credentials: found?.config?.credentials || {},
        }
      }
      setStates(next)
    } catch {
      // silent
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  const save = async (key: string) => {
    if (!businessId) return
    setSaving(key)
    try {
      const state = states[key] || { isActive: false, configured: false, credentials: {} }
      await fetch(`/api/integrations/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-active-business-id': businessId },
        body: JSON.stringify({ config: { credentials: state.credentials }, isActive: state.isActive }),
      })
      setStates((p) => ({ ...p, [key]: { ...p[key], configured: true } }))
    } catch {
      // silent
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2"><Plug size={20} className="text-cyan-300" /> Courier Providers</h3>
        <p className="text-xs text-slate-400 max-w-md text-right">
          Shiprocket is live today. Other carriers are ready to plug in the moment real API credentials are added.
        </p>
      </div>
      <div className="space-y-3">
        {SUPPORTED_COURIERS.map((c) => {
          const state = states[c.key] || { isActive: false, configured: false, credentials: {} }
          const isShiprocket = c.key === 'SHIPROCKET'
          return (
            <div key={c.key} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.label}</p>
                  <p className="text-xs text-slate-400">
                    {isShiprocket
                      ? 'Configured via server environment variables'
                      : state.configured
                      ? 'Credentials saved'
                      : 'Not yet configured — add API credentials to enable'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStates((p) => ({ ...p, [c.key]: { ...state, isActive: !state.isActive } }))}
                    disabled={isShiprocket}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${state.isActive ? 'bg-cyan-500' : 'bg-white/20'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  {!isShiprocket && (
                    <button
                      onClick={() => setExpanded((p) => (p === c.key ? null : c.key))}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:text-white"
                    >
                      {expanded === c.key ? 'Hide' : 'Configure'}
                    </button>
                  )}
                </div>
              </div>

              {!isShiprocket && expanded === c.key && (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  <p className="text-xs text-slate-400">
                    Store any credential fields this provider's API requires (API key, client id/secret, etc.).
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Credential key (e.g. apiKey)"
                      className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm"
                      id={`key-${c.key}`}
                    />
                    <input
                      placeholder="Value"
                      className="rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm"
                      id={`val-${c.key}`}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const keyInput = document.getElementById(`key-${c.key}`) as HTMLInputElement
                      const valInput = document.getElementById(`val-${c.key}`) as HTMLInputElement
                      if (!keyInput?.value) return
                      setStates((p) => ({
                        ...p,
                        [c.key]: {
                          ...state,
                          credentials: { ...state.credentials, [keyInput.value]: valInput?.value || '' },
                        },
                      }))
                      keyInput.value = ''
                      if (valInput) valInput.value = ''
                    }}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:text-white"
                  >
                    + Add credential field
                  </button>
                  {Object.keys(state.credentials).length > 0 && (
                    <ul className="text-xs text-slate-400 space-y-1">
                      {Object.entries(state.credentials).map(([k]) => (
                        <li key={k}>{k}: ••••••</li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => save(c.key)}
                    disabled={saving === c.key}
                    className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-4 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {saving === c.key ? 'Saving…' : 'Save Configuration'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Best-rate comparison: calls /api/shipping/compare-rates for a given order
 * and shows every provider's quote sorted cheapest-first, with the cheapest
 * highlighted. This is the "best of the best service in affordable rates"
 * requirement — unconfigured providers are simply absent from the list
 * rather than showing an error.
 */
function RateComparisonPanel() {
  const [orderId, setOrderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<RateQuote[] | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])

  const run = async () => {
    if (!orderId.trim()) return
    setLoading(true)
    setError(null)
    setQuotes(null)
    try {
      const res = await fetch('/api/shipping/compare-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: orderId.trim() }),
      })
      const d = await res.json()
      if (!d.success) {
        setError(d.message || 'Failed to compare rates')
      } else {
        setQuotes(d.quotes || [])
        setSkipped(d.skippedProviders || [])
      }
    } catch {
      setError('Failed to compare rates')
    }
    setLoading(false)
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
      <h3 className="text-xl font-bold mb-4">Best Rate Comparison</h3>
      <div className="flex gap-3">
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Order ID"
          className="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm"
        />
        <button
          onClick={run}
          disabled={loading}
          className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50 flex items-center gap-2"
        >
          <Search size={14} /> {loading ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {quotes && (
        <div className="mt-6 space-y-2">
          {quotes.length === 0 ? (
            <p className="text-sm text-slate-400">No quotes available from any configured provider for this order.</p>
          ) : (
            quotes.map((q, i) => (
              <div
                key={`${q.provider}-${q.courierId}`}
                className={`flex items-center justify-between rounded-2xl border px-5 py-3 ${i === 0 ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}
              >
                <div>
                  <p className="font-semibold">{q.courierName} <span className="text-xs text-slate-400">({q.provider})</span></p>
                  {q.etaDays != null && <p className="text-xs text-slate-400">ETA ~{q.etaDays}d</p>}
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${i === 0 ? 'text-cyan-300' : ''}`}>₹{q.rate}</p>
                  {i === 0 && <p className="text-xs text-cyan-300">Best rate</p>}
                </div>
              </div>
            ))
          )}
          {skipped.length > 0 && (
            <p className="text-xs text-slate-500 pt-2">Skipped (not configured): {skipped.join(', ')}</p>
          )}
        </div>
      )}
    </section>
  )
}

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
  const [businessId, setBusinessId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const businesses = d?.businesses || []
        const bId: string | null = d?.user?.activeBusinessId || businesses?.[0]?._id || null
        setBusinessId(bId)
      })
      .catch(() => {})
  }, [])

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

            <RateComparisonPanel />

            <CourierProvidersPanel businessId={businessId} />
          </>
        )}
      </div>
  )
}
