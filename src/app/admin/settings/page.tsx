'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, Hash, Plug, Sparkles, Save, User, ChevronRight } from 'lucide-react'

/**
 * Admin Settings hub — src/app/admin/settings.
 *
 * The user asked for a "settings" module but explicitly said "you decide
 * what to put in it." Scoped to the things an ERP admin actually needs to
 * configure business-wide, reusing APIs that ALREADY EXIST and work rather
 * than inventing new backends for all of them:
 *   - Business Profile:      NEW PATCH /api/businesses/[id] (added alongside this page)
 *   - Document Numbers:      EXISTING /api/admin/document-numbers, now covering EVERY document type
 *                            the platform actually generates (was 10 types, now 18 — see
 *                            core/numbering/types.ts's consolidation writeup), with per-type
 *                            active/inactive control added below.
 *   - Integrations:          EXISTING /api/integrations (Telegram/WhatsApp/Slack/Email)
 *   - AI / ANu:              EXISTING /api/ai/providers (AIConfig — same config ANu itself reads)
 *
 * The OLD src/app/settings/page.tsx (personal profile/password/notification
 * prefs) is NOT deleted or merged in here — it's a genuinely different
 * concern (per-user account settings vs. per-business admin settings) and
 * was already fully working. It's moved to src/app/admin/settings/account
 * and linked from the tab bar here so it isn't orphaned, per "don't miss
 * any feature."
 */

type Tab = 'profile' | 'numbering' | 'integrations' | 'ai'

interface DocConfig {
  documentType: string
  prefix: string
  separator: string
  includeFinancialYear: boolean
  includeMonth: boolean
  sequenceLength: number
  suffix: string
  startFrom: number
  isActive: boolean
  formatPreview: string
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  // Business profile
  const [profile, setProfile] = useState({ name: '', legalName: '', brandName: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  // Document numbering
  const [docConfigs, setDocConfigs] = useState<DocConfig[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  // Integrations
  const [integrations, setIntegrations] = useState<Record<string, any>>({})
  const [loadingIntegrations, setLoadingIntegrations] = useState(false)

  // AI / ANu
  const [aiConfig, setAiConfig] = useState<any>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const found = d.businesses?.find((b: any) => b._id === d.user?.activeBusinessId) || d.businesses?.[0]
          if (found) {
            setBusinessId(found._id)
            setProfile({ name: found.name || '', legalName: found.legalName || '', brandName: found.brandName || '' })
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!businessId) return
    if (tab === 'numbering') loadDocConfigs()
    if (tab === 'integrations') loadIntegrations()
    if (tab === 'ai') loadAiConfig()
  }, [tab, businessId])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) return
    setSavingProfile(true)
    setMsg('')
    try {
      const res = await fetch(`/api/businesses/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile),
      })
      const d = await res.json()
      setMsg(d.success ? '✓ Business profile updated' : d.message || 'Failed to save')
    } catch {
      setMsg('Failed to save')
    }
    setSavingProfile(false)
  }

  async function loadDocConfigs() {
    setLoadingDocs(true)
    try {
      const res = await fetch(`/api/admin/document-numbers?businessId=${businessId}`, { credentials: 'include' })
      const d = await res.json()
      if (d.success) setDocConfigs(d.data)
    } catch {}
    setLoadingDocs(false)
  }

  async function saveDocConfig(cfg: DocConfig) {
    try {
      const res = await fetch('/api/admin/document-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId, ...cfg }),
      })
      const d = await res.json()
      if (d.success) {
        setMsg(`✓ ${cfg.documentType} numbering saved`)
        loadDocConfigs()
      }
    } catch {
      setMsg('Failed to save numbering config')
    }
  }

  async function loadIntegrations() {
    setLoadingIntegrations(true)
    try {
      const res = await fetch(`/api/integrations?businessId=${businessId}`, { credentials: 'include' })
      const d = await res.json()
      if (d.success) {
        const byProvider: Record<string, any> = {}
        for (const i of d.integrations) byProvider[i.provider] = i
        setIntegrations(byProvider)
      }
    } catch {}
    setLoadingIntegrations(false)
  }

  async function loadAiConfig() {
    setLoadingAi(true)
    try {
      const res = await fetch('/api/ai/providers', {
        credentials: 'include',
        headers: businessId ? { 'x-active-business-id': businessId } : undefined,
      })
      const d = await res.json()
      if (d.success) setAiConfig(d.config)
    } catch {}
    setLoadingAi(false)
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Business Profile', icon: <Building2 size={14} /> },
    { key: 'numbering', label: 'Document Numbers', icon: <Hash size={14} /> },
    { key: 'integrations', label: 'Integrations', icon: <Plug size={14} /> },
    { key: 'ai', label: 'AI / ANu', icon: <Sparkles size={14} /> },
  ]

  return (
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Admin</p>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          <Link href="/admin/settings/account" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900">
            <User size={13} /> My Account Settings <ChevronRight size={13} />
          </Link>
        </div>

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith('✓') ? 'bg-green-500/10 border border-green-500/20 text-green-700' : 'bg-red-500/10 border border-red-500/20 text-red-700'}`}>
            {msg}
          </div>
        )}

        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setMsg('') }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all flex-1 justify-center whitespace-nowrap ${tab === t.key ? 'bg-gray-900 text-white font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Business Profile</h3>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Business Name</label>
                <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Legal Name</label>
                <input value={profile.legalName} onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Brand Name</label>
                <input value={profile.brandName} onChange={(e) => setProfile({ ...profile, brandName: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
              <button type="submit" disabled={savingProfile} className="btn-primary rounded-xl px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
                <Save size={13} /> {savingProfile ? 'Saving…' : 'Save Profile'}
              </button>
            </form>
          </div>
        )}

        {tab === 'numbering' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Document Numbering</h3>
            <p className="text-xs text-gray-500 mb-5">
              Every document type the platform generates — invoices, orders, GRNs, transfers, and more — is listed here. Set a prefix, starting number, and whether numbering is active; every document number is generated from this configuration, nowhere else.
            </p>
            {loadingDocs ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <div className="space-y-3">
                {docConfigs.map((cfg: DocConfig, i: number) => (
                  <div key={cfg.documentType} className="rounded-xl border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-[140px]">
                      <p className="text-sm font-medium text-gray-900">{cfg.documentType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Preview: {cfg.formatPreview}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Prefix</label>
                      <input
                        value={cfg.prefix}
                        onChange={(e) => {
                          const updated = [...docConfigs]
                          updated[i] = { ...cfg, prefix: e.target.value }
                          setDocConfigs(updated)
                        }}
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center outline-none focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Start From</label>
                      <input
                        type="number"
                        min={1}
                        value={cfg.startFrom}
                        onChange={(e) => {
                          const updated = [...docConfigs]
                          updated[i] = { ...cfg, startFrom: Number(e.target.value) || 1 }
                          setDocConfigs(updated)
                        }}
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center outline-none focus:border-gray-400"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const updated = [...docConfigs]
                        updated[i] = { ...cfg, isActive: !cfg.isActive }
                        setDocConfigs(updated)
                      }}
                      className="flex flex-col items-center gap-0.5"
                      title={cfg.isActive ? 'Numbering active — click to disable' : 'Numbering disabled — click to enable'}
                    >
                      <span className="text-[10px] text-gray-400">Active</span>
                      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all ${cfg.isActive ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-all ${cfg.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                      </span>
                    </button>
                    <button
                      onClick={() => saveDocConfig(docConfigs[i])}
                      className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-xs font-medium"
                    >
                      Save
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'integrations' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Notification Integrations</h3>
            {loadingIntegrations ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <div className="space-y-3">
                {['TELEGRAM', 'WHATSAPP', 'SLACK', 'EMAIL'].map((provider) => (
                  <div key={provider} className="rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{provider}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {integrations[provider]?.isActive ? 'Connected' : 'Not configured'}
                      </p>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${integrations[provider]?.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-2">
                  Full credential editing (bot tokens, webhook URLs) uses the existing /admin/integrations screen — this view is a status summary.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'ai' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">AI / ANu Configuration</h3>
            <p className="text-xs text-gray-500 mb-5">
              ANu (the in-house assistant at Admin &gt; AI Workspace) uses whichever provider below is enabled, preferring Anthropic if both are set. Add an API key here to turn ANu on for this business.
            </p>
            {loadingAi ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <div className="space-y-3">
                {aiConfig && ['anthropic', 'openai'].map((provider) => (
                  <div key={provider} className="rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{provider}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {aiConfig.providers[provider]?.apiKey ? `Key ${aiConfig.providers[provider].apiKey}` : 'No key configured'}
                      </p>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${aiConfig.providers[provider]?.isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  </div>
                ))}
                <p className="text-xs text-gray-400 pt-2">
                  Full API-key editing uses the existing /admin/ai-image screen's provider settings (same AIConfig record ANu reads) — this view is a status summary.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
  )
}
