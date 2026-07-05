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
            <p className="text-xs text-gray-500 uppercase tracking-widest">ERP</p>
            <h1 className="text-2xl font-bold text-gray-900">CRM — Leads & Customers</h1>
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
              placeholder="Search leads..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none" />
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-600 text-sm">Loading CRM data…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">No leads found. Add your first lead.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Name', 'Email', 'Phone', 'Company', 'Stage', 'Value'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-900 font-medium">{l.name}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{l.email || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{l.phone || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{l.company || '—'}</td>
                    <td className="px-5 py-3"><span className={`badge ${stageColor[l.stage] || 'badge-info'}`}>{l.stage}</span></td>
                    <td className="px-5 py-3 text-sm text-gray-900">₹{(l.value || 0).toLocaleString()}</td>
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
