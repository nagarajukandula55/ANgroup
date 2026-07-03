'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, X, FileSignature, Loader2, Download, Send,
  Clock, CheckCircle, XCircle, Eye, PenTool, FileText, Users
} from 'lucide-react'

interface Agreement {
  _id: string
  title: string
  content: string
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'DECLINED' | 'EXPIRED'
  parties: { name: string; email: string; signedAt?: string }[]
  createdAt: string
  expiresAt?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:    { label: 'Draft',    color: 'bg-gray-100 text-gray-600',    icon: FileText },
  SENT:     { label: 'Sent',     color: 'bg-blue-50 text-blue-700',     icon: Send },
  SIGNED:   { label: 'Signed',   color: 'bg-green-50 text-green-700',   icon: CheckCircle },
  DECLINED: { label: 'Declined', color: 'bg-red-50 text-red-700',       icon: XCircle },
  EXPIRED:  { label: 'Expired',  color: 'bg-yellow-50 text-yellow-700', icon: Clock },
}

const TEMPLATES = [
  { key: 'nda',       label: 'Non-Disclosure Agreement (NDA)',    desc: 'Protect confidential information' },
  { key: 'vendor',    label: 'Vendor Agreement',                  desc: 'Terms for vendor partnerships' },
  { key: 'employee',  label: 'Employment Contract',               desc: 'Standard employment terms' },
  { key: 'service',   label: 'Service Agreement',                 desc: 'Client service terms' },
  { key: 'custom',    label: 'Custom Agreement',                  desc: 'Write your own from scratch' },
]

export default function AgreementsPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [agreements, setAgreements]   = useState<Agreement[]>([])
  const [loading, setLoading]         = useState(true)
  const [businessId, setBusinessId]   = useState<string | null>(null)
  const [showForm, setShowForm]       = useState(false)
  const [showSign, setShowSign]       = useState<Agreement | null>(null)
  const [activeTab, setActiveTab]     = useState('ALL')
  const [submitting, setSubmitting]   = useState(false)
  const [drawing, setDrawing]         = useState(false)
  const [hasSig, setHasSig]          = useState(false)

  const [form, setForm] = useState({
    title: '', content: '', template: '', parties: [{ name: '', email: '' }], expiresAt: '',
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const bId = d.user?.activeBusinessId
      setBusinessId(bId)
      if (bId) fetchAgreements(bId)
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function fetchAgreements(bId: string) {
    setLoading(true)
    try {
      const r = await fetch(`/api/agreements?businessId=${bId}`)
      const d = await r.json()
      setAgreements(d.agreements ?? d.data ?? [])
    } catch { } finally { setLoading(false) }
  }

  async function handleCreate(sendNow: boolean) {
    setSubmitting(true)
    try {
      await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, businessId, status: sendNow ? 'SENT' : 'DRAFT' }),
      })
      setShowForm(false)
      setForm({ title: '', content: '', template: '', parties: [{ name: '', email: '' }], expiresAt: '' })
      if (businessId) fetchAgreements(businessId)
    } catch { } finally { setSubmitting(false) }
  }

  function addParty() {
    setForm(f => ({ ...f, parties: [...f.parties, { name: '', email: '' }] }))
  }
  function removeParty(i: number) {
    setForm(f => ({ ...f, parties: f.parties.filter((_, j) => j !== i) }))
  }
  function updateParty(i: number, field: string, val: string) {
    setForm(f => ({ ...f, parties: f.parties.map((p, j) => j === i ? { ...p, [field]: val } : p) }))
  }

  /* Signature canvas */
  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setDrawing(true)
  }
  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111827'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke(); setHasSig(true)
  }
  function stopDraw() { setDrawing(false) }
  function clearSig() {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasSig(false)
  }
  async function submitSignature() {
    if (!canvasRef.current || !showSign) return
    const sigData = canvasRef.current.toDataURL()
    setSubmitting(true)
    try {
      await fetch(`/api/agreements/${showSign._id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: sigData }),
      })
      setShowSign(null)
      if (businessId) fetchAgreements(businessId)
    } catch { } finally { setSubmitting(false) }
  }

  const tabs = ['ALL', 'DRAFT', 'SENT', 'SIGNED']
  const filtered = activeTab === 'ALL' ? agreements : agreements.filter(a => a.status === activeTab)

  const stats = {
    total:  agreements.length,
    sent:   agreements.filter(a => a.status === 'SENT').length,
    signed: agreements.filter(a => a.status === 'SIGNED').length,
    draft:  agreements.filter(a => a.status === 'DRAFT').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 shadow-sm">
            <ArrowLeft size={15} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Agreements</h1>
            <p className="text-sm text-gray-500">Create, send, and digitally sign agreements</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gray-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-800">
            <Plus size={15} /> New Agreement
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[['Total', stats.total], ['Sent', stats.sent], ['Signed', stats.signed], ['Drafts', stats.draft]].map(([l, v]) => (
            <div key={l} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm text-gray-500">{l}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{v}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileSignature className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No agreements yet. Create your first one!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Parties</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(ag => {
                  const cfg = STATUS_CONFIG[ag.status] || STATUS_CONFIG.DRAFT
                  const StatusIcon = cfg.icon
                  return (
                    <tr key={ag._id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900 truncate max-w-xs">{ag.title}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-600">{ag.parties?.length ?? 0} parties</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                          <StatusIcon size={10} /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400">
                        {new Date(ag.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => setShowSign(ag)}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
                            <PenTool size={11} /> Sign
                          </button>
                          <button className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
                            <Eye size={11} /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Agreement slide-over */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-lg bg-white border-l border-gray-200 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">New Agreement</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X size={15} className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Template picker */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Template</label>
                <div className="space-y-2">
                  {TEMPLATES.map(t => (
                    <button key={t.key} onClick={() => setForm(f => ({ ...f, template: t.key }))}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition ${form.template === t.key ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                      <p className="font-medium">{t.label}</p>
                      <p className={`text-xs mt-0.5 ${form.template === t.key ? 'text-gray-300' : 'text-gray-400'}`}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Agreement Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Non-Disclosure Agreement with Acme Corp"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Content *</label>
                <textarea rows={8} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Enter the full agreement text here..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 font-mono" />
              </div>

              {/* Parties */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Signatories</label>
                  <button onClick={addParty} className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1">
                    <Plus size={11} /> Add party
                  </button>
                </div>
                <div className="space-y-2">
                  {form.parties.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={p.name} onChange={e => updateParty(i, 'name', e.target.value)}
                        placeholder="Name"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                      <input value={p.email} onChange={e => updateParty(i, 'email', e.target.value)}
                        placeholder="Email"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                      {form.parties.length > 1 && (
                        <button onClick={() => removeParty(i)} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200">
                          <X size={13} className="text-gray-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Expiry Date (optional)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
              <button onClick={() => handleCreate(false)} disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">
                Save Draft
              </button>
              <button onClick={() => handleCreate(true)} disabled={submitting || !form.title || !form.content}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send for Signing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Signature Modal */}
      {showSign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <PenTool size={16} className="text-gray-700" />
                <h2 className="font-semibold text-gray-900">Sign Agreement</h2>
              </div>
              <button onClick={() => setShowSign(null)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X size={15} className="text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-gray-900 mb-1">{showSign.title}</p>
              <p className="text-xs text-gray-500 mb-4">Draw your signature in the box below</p>
              <div className="rounded-xl border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50">
                <canvas
                  ref={canvasRef}
                  width={420} height={160}
                  onMouseDown={startDraw} onMouseMove={draw}
                  onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  className="cursor-crosshair w-full"
                  style={{ touchAction: 'none' }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">Sign above using your mouse or trackpad</p>
              <div className="flex gap-2 mt-4">
                <button onClick={clearSig}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">
                  Clear
                </button>
                <button onClick={submitSignature} disabled={!hasSig || submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Confirm Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
