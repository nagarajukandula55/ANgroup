'use client'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout'
import { FileSignature, Plus, Search, Eye, PenLine, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react'

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [signMode, setSignMode] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '', type: 'VENDOR_SUPPLY', companyName: 'AN Group', companySignatory: 'Raj',
    vendorName: '', vendorEmail: '', vendorSignatory: '', startDate: '', endDate: '',
    value: '', currency: 'INR', notes: '',
    content: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await fetch('/api/agreements/list', { credentials: 'include' })
      const d = await res.json()
      if (d.success) setAgreements(d.agreements || [])
    } catch {}
    setLoading(false)
  }

  async function createAgreement(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      // Auto-generate content if not provided
      const content = form.content || generateDefaultContent(form)
      const res = await fetch('/api/agreements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, content }),
      })
      const d = await res.json()
      if (d.success) { setShowCreate(false); load() }
    } catch {}
    setCreating(false)
  }

  function generateDefaultContent(f: typeof form) {
    return `<h2>${f.title}</h2>
<p>This ${f.type.replace(/_/g,' ')} Agreement ("Agreement") is entered into as of ${f.startDate || new Date().toLocaleDateString()} between:</p>
<p><strong>${f.companyName}</strong> ("Company"), represented by <strong>${f.companySignatory}</strong></p>
<p>AND</p>
<p><strong>${f.vendorName}</strong> ("Vendor"), represented by <strong>${f.vendorSignatory}</strong></p>

<h3>1. Purpose</h3>
<p>This Agreement establishes the terms and conditions governing the business relationship between the parties.</p>

<h3>2. Term</h3>
<p>This Agreement shall commence on ${f.startDate || 'the signing date'} and shall remain in effect until ${f.endDate || 'terminated by either party with 30 days written notice'}.</p>

<h3>3. Commercial Terms</h3>
<p>Agreement value: ${f.currency} ${f.value || 'As agreed between parties'}</p>

<h3>4. Obligations</h3>
<p>Both parties agree to fulfil their respective obligations as discussed and agreed upon.</p>

<h3>5. Confidentiality</h3>
<p>Both parties agree to maintain strict confidentiality of any proprietary information shared during the course of this agreement.</p>

<h3>6. Governing Law</h3>
<p>This Agreement shall be governed by the laws of India.</p>

${f.notes ? `<h3>7. Additional Notes</h3><p>${f.notes}</p>` : ''}

<p>IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.</p>`
  }

  async function sign(party: 'company' | 'vendor') {
    if (!selected) return
    // Simple signature — in production this would be a canvas/drawing pad
    const signature = prompt(`Enter your signature (full name) as ${party === 'company' ? selected.companySignatory : selected.vendorSignatory}:`)
    if (!signature) return

    await fetch('/api/agreements/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ agreementId: selected._id, party, signature }),
    })
    load()
    setSelected(null)
  }

  const filtered = agreements.filter(a =>
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.vendorName?.toLowerCase().includes(search.toLowerCase()) ||
    a.agreementNumber?.toLowerCase().includes(search.toLowerCase())
  )

  const statusIcon: Record<string, any> = {
    DRAFT: <Clock size={12} className="text-zinc-500" />,
    PENDING_VENDOR: <AlertCircle size={12} className="text-yellow-400" />,
    PENDING_COMPANY: <AlertCircle size={12} className="text-blue-400" />,
    SIGNED: <CheckCircle2 size={12} className="text-green-400" />,
    CANCELLED: <X size={12} className="text-red-400" />,
  }

  const statusBadge: Record<string, string> = {
    DRAFT: 'badge-pending', PENDING_VENDOR: 'badge-pending', PENDING_COMPANY: 'badge-info',
    SIGNED: 'badge-active', CANCELLED: 'badge-inactive'
  }

  return (
    <Layout>
      <div className="space-y-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Documents</p>
            <h1 className="text-2xl font-bold text-white">Agreements</h1>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary rounded-xl px-4 py-2 text-sm flex items-center gap-2">
            <Plus size={14} /> New Agreement
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: agreements.length },
            { label: 'Signed', value: agreements.filter(a => a.status === 'SIGNED').length },
            { label: 'Pending', value: agreements.filter(a => a.status.startsWith('PENDING')).length },
            { label: 'Draft', value: agreements.filter(a => a.status === 'DRAFT').length },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className="text-xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-6">
            <h3 className="text-sm font-semibold text-white mb-5">New Agreement</h3>
            <form onSubmit={createAgreement} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-2 md:col-span-3">
                  <label className="text-xs text-zinc-500 mb-1 block">Agreement Title *</label>
                  <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                    placeholder="Supply Agreement with ABC Vendors"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Agreement Type *</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none">
                    {['VENDOR_SUPPLY', 'NDA', 'SERVICE_LEVEL', 'PARTNERSHIP', 'EMPLOYMENT', 'DISTRIBUTION'].map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Company Signatory</label>
                  <input value={form.companySignatory} onChange={e => setForm({...form, companySignatory: e.target.value})}
                    placeholder="Your name" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Vendor/Party Name *</label>
                  <input value={form.vendorName} onChange={e => setForm({...form, vendorName: e.target.value})} required
                    placeholder="ABC Vendors Pvt Ltd"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Vendor Email *</label>
                  <input type="email" value={form.vendorEmail} onChange={e => setForm({...form, vendorEmail: e.target.value})} required
                    placeholder="vendor@example.com"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Vendor Signatory *</label>
                  <input value={form.vendorSignatory} onChange={e => setForm({...form, vendorSignatory: e.target.value})} required
                    placeholder="Vendor representative name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Agreement Value (₹)</label>
                  <input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})}
                    placeholder="0"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="text-xs text-zinc-500 mb-1 block">Notes (optional)</label>
                  <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                    placeholder="Any special terms or notes..."
                    rows={2}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-white/25 resize-none" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={creating}
                  className="btn-primary rounded-xl px-5 py-2 text-sm disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create Agreement'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary rounded-xl px-4 py-2 text-sm">
                  Cancel
                </button>
                <p className="text-xs text-zinc-600 ml-auto">Agreement content is auto-generated from the above details</p>
              </div>
            </form>
          </div>
        )}

        {/* Agreement detail modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-mono text-zinc-500">{selected.agreementNumber}</p>
                  <h2 className="text-xl font-bold text-white mt-1">{selected.title}</h2>
                  <span className={`badge ${statusBadge[selected.status] || 'badge-info'} mt-2 inline-flex`}>{selected.status.replace(/_/g,' ')}</span>
                </div>
                <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-white p-1"><X size={18} /></button>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="text-xs text-zinc-500 mb-2">Company Party</p>
                  <p className="text-sm font-semibold text-white">{selected.companyName}</p>
                  <p className="text-xs text-zinc-400">Signatory: {selected.companySignatory}</p>
                  {selected.companySignature ? (
                    <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Signed: {selected.companySignature}
                    </p>
                  ) : (
                    <button onClick={() => sign('company')}
                      className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-all">
                      <PenLine size={11} /> Sign as Company
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <p className="text-xs text-zinc-500 mb-2">Vendor Party</p>
                  <p className="text-sm font-semibold text-white">{selected.vendorName}</p>
                  <p className="text-xs text-zinc-400">Signatory: {selected.vendorSignatory}</p>
                  <p className="text-xs text-zinc-400">Email: {selected.vendorEmail}</p>
                  {selected.vendorSignature ? (
                    <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Signed: {selected.vendorSignature}
                    </p>
                  ) : (
                    <button onClick={() => sign('vendor')}
                      className="mt-2 flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 transition-all">
                      <PenLine size={11} /> Sign as Vendor
                    </button>
                  )}
                </div>
              </div>

              {/* Agreement content */}
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 prose prose-sm prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selected.content || '<p>No content</p>' }} />

              {selected.status === 'SIGNED' && (
                <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4 flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">Agreement Fully Signed</p>
                    <p className="text-xs text-green-600">Both parties have signed. This agreement is legally binding.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* List */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <Search size={14} className="text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search agreements..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none" />
          </div>

          {loading ? (
            <div className="py-16 text-center text-zinc-600 text-sm">Loading agreements…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileSignature size={32} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">No agreements found</p>
              <p className="text-xs text-zinc-700 mt-1">Create your first vendor agreement</p>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.04]">
                {['Agreement #', 'Title', 'Vendor', 'Type', 'Value', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={i} className="border-t border-white/[0.03] hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelected(a)}>
                    <td className="px-5 py-3 text-xs font-mono text-zinc-400">{a.agreementNumber}</td>
                    <td className="px-5 py-3 text-sm text-white font-medium">{a.title}</td>
                    <td className="px-5 py-3 text-sm text-zinc-300">{a.vendorName}</td>
                    <td className="px-5 py-3 text-xs text-zinc-500">{a.type?.replace(/_/g,' ')}</td>
                    <td className="px-5 py-3 text-sm text-white">₹{(a.value || 0).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {statusIcon[a.status]}
                        <span className={`badge ${statusBadge[a.status] || 'badge-info'}`}>{a.status.replace(/_/g,' ')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Eye size={14} className="text-zinc-500 hover:text-white transition-all" />
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
