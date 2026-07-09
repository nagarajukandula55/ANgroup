'use client'

import { useEffect, useState } from 'react'
import { Landmark, Send, RefreshCw, Settings2, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

/**
 * GST Filing — src/app/admin/gst.
 *
 * Built per explicit user request: "push our bills to gst portal directly
 * and also our assistant should assist with all the processes and
 * pendings." Two tabs: Filings (queue/submit/status per invoice) and
 * Settings (GSTIN + provider config, backed by GstPortalConfig). See
 * core/gst/gstPortalAdapter.ts's top comment for why the actual portal push
 * is a stub in this environment (no live GSP/ASP credentials to build
 * against) — everything around it (model, service, UI, ANu awareness) is
 * real and ready for a real provider integration to be dropped in.
 */

type Tab = 'filings' | 'config'

interface Filing {
  _id: string
  invoiceNumber: string
  returnType: string
  period: string
  status: string
  rejectionReason?: string
  portalReferenceId?: string
  createdAt: string
}

export default function GstFilingPage() {
  const [tab, setTab] = useState<Tab>('filings')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const [filings, setFilings] = useState<Filing[]>([])
  const [loadingFilings, setLoadingFilings] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const [config, setConfig] = useState<any>(null)
  const [gstin, setGstin] = useState('')
  const [provider, setProvider] = useState('NONE')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)
  const [autoSubmit, setAutoSubmit] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const found = d.businesses?.find((b: any) => b._id === d.user?.activeBusinessId) || d.businesses?.[0]
          if (found) setBusinessId(found._id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!businessId) return
    if (tab === 'filings') loadFilings()
    if (tab === 'config') loadConfig()
  }, [tab, businessId])

  async function loadFilings() {
    if (!businessId) return
    setLoadingFilings(true)
    try {
      const res = await fetch(`/api/gst/filings?businessId=${businessId}`, { credentials: 'include' })
      const d = await res.json()
      if (d.success) setFilings(d.data)
    } catch {}
    setLoadingFilings(false)
  }

  async function loadConfig() {
    if (!businessId) return
    try {
      const res = await fetch(`/api/gst/config?businessId=${businessId}`, { credentials: 'include' })
      const d = await res.json()
      if (d.success && d.data) {
        setConfig(d.data)
        setGstin(d.data.gstin || '')
        setProvider(d.data.provider || 'NONE')
        setIsEnabled(!!d.data.isEnabled)
        setAutoSubmit(!!d.data.autoSubmit)
      }
    } catch {}
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) return
    setSavingConfig(true)
    setMsg('')
    try {
      const res = await fetch('/api/gst/config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          businessId, gstin, provider, isEnabled, autoSubmit,
          ...(apiKey ? { apiKey } : {}),
          ...(apiSecret ? { apiSecret } : {}),
        }),
      })
      const d = await res.json()
      setMsg(d.success ? 'Saved.' : d.error || 'Failed to save')
      if (d.success) { setApiKey(''); setApiSecret(''); loadConfig() }
    } catch {
      setMsg('Failed to save')
    }
    setSavingConfig(false)
  }

  async function submitFiling(id: string) {
    setSubmittingId(id)
    try {
      const res = await fetch(`/api/gst/filings/${id}/submit`, { method: 'POST', credentials: 'include' })
      const d = await res.json()
      setMsg(d.success ? 'Filing submitted.' : d.error || 'Submission failed')
      loadFilings()
    } catch {
      setMsg('Submission failed')
    }
    setSubmittingId(null)
  }

  function statusBadge(status: string) {
    const map: Record<string, { color: string; icon: any }> = {
      PENDING: { color: 'text-amber-300 border-amber-400/30 bg-amber-400/10', icon: Clock },
      SUBMITTED: { color: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10', icon: Send },
      ACCEPTED: { color: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10', icon: CheckCircle2 },
      REJECTED: { color: 'text-red-300 border-red-400/30 bg-red-400/10', icon: AlertCircle },
      FAILED: { color: 'text-red-300 border-red-400/30 bg-red-400/10', icon: AlertCircle },
    }
    const cfg = map[status] || map.PENDING
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.color}`}>
        <Icon className="h-3.5 w-3.5" /> {status}
      </span>
    )
  }

  return (
      <div className="space-y-8">
        <section className="rounded-[40px] border border-white/10 bg-white/5 p-10">
          <p className="uppercase tracking-[0.35em] text-cyan-300 text-sm">COMPLIANCE</p>
          <h1 className="mt-5 text-6xl font-black flex items-center gap-4">
            <Landmark className="h-12 w-12" /> GST Filing
          </h1>
          <p className="mt-4 max-w-2xl text-white/60">
            Push sales invoices to the GST portal and track filing status. ANu can help you understand what's pending — ask it in AI Workspace.
          </p>
        </section>

        <div className="flex gap-3">
          {(['filings', 'config'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                tab === t ? 'bg-cyan-400 text-black' : 'border border-white/10 text-white/60 hover:text-white'
              }`}
            >
              {t === 'filings' ? 'Filings' : 'Settings'}
            </button>
          ))}
        </div>

        {msg && <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm">{msg}</div>}

        {tab === 'filings' && (
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Filings</h2>
              <button onClick={loadFilings} className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
            {loadingFilings ? (
              <p className="text-white/40">Loading...</p>
            ) : filings.length === 0 ? (
              <p className="text-white/40">No filings queued yet. Filings are created from a sales invoice's detail page.</p>
            ) : (
              <div className="space-y-3">
                {filings.map((f: Filing) => (
                  <div key={f._id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-6 py-4">
                    <div>
                      <p className="font-semibold">{f.invoiceNumber}</p>
                      <p className="text-sm text-white/50">{f.returnType} · {f.period}</p>
                      {f.rejectionReason && <p className="text-sm text-red-300 mt-1">{f.rejectionReason}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      {statusBadge(f.status)}
                      {(f.status === 'PENDING' || f.status === 'FAILED') && (
                        <button
                          onClick={() => submitFiling(f._id)}
                          disabled={submittingId === f._id}
                          className="rounded-full bg-cyan-400 px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
                        >
                          {submittingId === f._id ? 'Submitting...' : 'Submit'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'config' && (
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Settings2 className="h-6 w-6" /> Portal Settings</h2>
            <form onSubmit={saveConfig} className="space-y-5 max-w-xl">
              <div>
                <label className="text-sm text-white/60">GSTIN</label>
                <input value={gstin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGstin(e.target.value)} required
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5" />
              </div>
              <div>
                <label className="text-sm text-white/60">Provider</label>
                <select value={provider} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProvider(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5">
                  <option value="NONE">Not configured</option>
                  <option value="GSTN_DIRECT">GSTN Direct</option>
                  <option value="CLEARTAX">ClearTax</option>
                  <option value="MASTERS_INDIA">Masters India</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60">API Key {config?.apiKeySet && '(already set — leave blank to keep)'}</label>
                <input type="password" value={apiKey} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5" />
              </div>
              <div>
                <label className="text-sm text-white/60">API Secret {config?.apiSecretSet && '(already set — leave blank to keep)'}</label>
                <input type="password" value={apiSecret} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiSecret(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isEnabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsEnabled(e.target.checked)} /> Enable GST portal push
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={autoSubmit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoSubmit(e.target.checked)} /> Auto-queue filing when an invoice is created
              </label>
              <button disabled={savingConfig} type="submit"
                className="rounded-full bg-cyan-400 px-6 py-2.5 font-semibold text-black disabled:opacity-50">
                {savingConfig ? 'Saving...' : 'Save'}
              </button>
            </form>
          </section>
        )}
      </div>
  )
}
