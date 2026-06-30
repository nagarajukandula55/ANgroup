'use client'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout'
import { Users, Plus, Search, Phone, Mail, TrendingUp } from 'lucide-react'

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/crm/leads', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data.success) setLeads(data.leads || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = leads.filter(l =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  )

  const stageColor: Record<string, string> = {
    NEW: 'badge-info', CONTACTED: 'badge-pending', QUALIFIED: 'badge-active',
    PROPOSAL: 'badge-pending', WON: 'badge-active', LOST: 'badge-inactive'
  }

  return (
    <Layout>
      <div className="space-y-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">ERP</p>
            <h1 className="text-2xl font-bold text-white">CRM — Leads & Customers</h1>
          </div>
          <button className="btn-primary rounded-xl px-4 py-2 text-sm flex items-center gap-2">
            <Plus size={14} /> Add Lead
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: leads.length },
            { label: 'New', value: leads.filter(l => l.stage === 'NEW').length },
            { label: 'Won', value: leads.filter(l => l.stage === 'WON').length },
            { label: 'Conversion', value: leads.length ? `${Math.round(leads.filter(l => l.stage === 'WON').length / leads.length * 100)}%` : '0%' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className="text-xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <Search size={14} className="text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none" />
          </div>

          {loading ? (
            <div className="py-16 text-center text-zinc-600 text-sm">Loading CRM data…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">No leads found. Add your first lead.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Name', 'Email', 'Phone', 'Company', 'Stage', 'Value'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={i} className="border-t border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-sm text-white font-medium">{l.name}</td>
                    <td className="px-5 py-3 text-xs text-zinc-400">{l.email || '—'}</td>
                    <td className="px-5 py-3 text-xs text-zinc-400">{l.phone || '—'}</td>
                    <td className="px-5 py-3 text-sm text-zinc-300">{l.company || '—'}</td>
                    <td className="px-5 py-3"><span className={`badge ${stageColor[l.stage] || 'badge-info'}`}>{l.stage}</span></td>
                    <td className="px-5 py-3 text-sm text-white">₹{(l.value || 0).toLocaleString()}</td>
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
