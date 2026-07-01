'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Building2,
  CheckCircle,
  Clock,
  Star,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react'

interface Vendor {
  _id:            string
  vendorId?:      string
  companyName:    string
  contactPerson?: string
  email?:         string
  phone?:         string
  gstNumber?:     string
  rating?:        number
  status?:        string
  isApproved?:    boolean
  address?:       string
}

interface Credentials {
  email:    string
  password: string
  loginUrl: string
  message:  string
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-green-500/20 text-green-400',
  PENDING:  'bg-yellow-500/20 text-yellow-400',
  ACTIVE:   'bg-blue-500/20 text-blue-400',
  INACTIVE: 'bg-zinc-500/20 text-zinc-400',
  REJECTED: 'bg-red-500/20 text-red-400',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`}
        />
      ))}
    </div>
  )
}

function CredentialsModal({
  creds,
  onClose,
}: {
  creds: Credentials
  onClose: () => void
}) {
  const [showPass, setShowPass] = useState(false)
  const [copied, setCopied]     = useState(false)

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">Vendor Account Created</h2>
            <p className="text-xs text-zinc-500">Share these login credentials with the vendor</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            {creds.message}
          </p>

          {/* Email */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 block">
              Login Email
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white font-mono">
                {creds.email}
              </code>
              <button
                onClick={() => copy(creds.email)}
                className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] shrink-0 text-zinc-400"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 block">
              Temporary Password
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white font-mono">
                {showPass ? creds.password : '••••••••••'}
              </code>
              <button
                onClick={() => setShowPass((p) => !p)}
                className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] shrink-0 text-zinc-400"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => copy(creds.password)}
                className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] shrink-0 text-zinc-400"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Login URL */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 block">
              Login URL
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white font-mono">
                {typeof window !== 'undefined' ? window.location.origin : ''}{creds.loginUrl}
              </code>
              <button
                onClick={() => copy((typeof window !== 'undefined' ? window.location.origin : '') + creds.loginUrl)}
                className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] shrink-0 text-zinc-400"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {copied && (
            <p className="text-xs text-green-400 text-center">Copied to clipboard!</p>
          )}
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-100 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VendorsPage() {
  const router = useRouter()
  const [vendors, setVendors]       = useState<Vendor[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<Credentials | null>(null)

  const [form, setForm] = useState({
    companyName:   '',
    contactPerson: '',
    email:         '',
    phone:         '',
    gstNumber:     '',
    address:       '',
  })

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const d   = await res.json()
          const bId = d.user?.activeBusinessId ?? d.user?.businessId ?? null
          setBusinessId(bId)
          if (bId) fetchVendors(bId)
          else setLoading(false)
        } else {
          setLoading(false)
        }
      } catch {
        setError('Failed to load user info')
        setLoading(false)
      }
    }
    init()
  }, [])

  async function fetchVendors(bId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/vendors?businessId=${bId}`)
      const d   = await res.json()
      if (d.success) setVendors(d.vendors ?? [])
      else setError(d.error || 'Failed to load vendors')
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    setApprovingId(id)
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isApproved: true, status: 'APPROVED' }),
      })
      if (res.ok) {
        setVendors((prev) =>
          prev.map((v) =>
            v._id === id ? { ...v, isApproved: true, status: 'APPROVED' } : v
          )
        )
      }
    } catch { /* silent */ } finally {
      setApprovingId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/vendors', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, businessId }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) {
        throw new Error(d.error ?? d.message ?? 'Failed to onboard vendor')
      }
      setShowForm(false)
      setForm({ companyName: '', contactPerson: '', email: '', phone: '', gstNumber: '', address: '' })
      if (businessId) fetchVendors(businessId)
      /* Show credentials modal if a new user account was provisioned */
      if (d.credentials) setCredentials(d.credentials)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const total    = vendors.length
  const approved = vendors.filter((v) => v.isApproved || v.status === 'APPROVED').length
  const pending  = vendors.filter((v) => !v.isApproved && v.status !== 'APPROVED').length
  const active   = vendors.filter((v) => v.status === 'ACTIVE').length

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {credentials && (
        <CredentialsModal creds={credentials} onClose={() => setCredentials(null)} />
      )}

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Vendors</h1>
            <p className="text-sm text-zinc-500">Vendor onboarding and management</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-white text-black text-sm font-medium px-4 py-2 rounded-xl hover:bg-zinc-100 transition"
          >
            <Plus className="w-4 h-4" /> Onboard Vendor
          </button>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Building2,    label: 'Total Vendors',    value: String(total)    },
            { icon: CheckCircle,  label: 'Approved',         value: String(approved) },
            { icon: Clock,        label: 'Pending Approval', value: String(pending)  },
            { icon: Star,         label: 'Active',           value: String(active)   },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-400 text-sm">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-zinc-300" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Company</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Contact</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">GST</th>
                <th className="text-center px-6 py-3 text-zinc-500 font-medium">Rating</th>
                <th className="text-center px-6 py-3 text-zinc-500 font-medium">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-zinc-500">
                    No vendors found. Click &quot;Onboard Vendor&quot; to add one.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const isApproved = v.isApproved || v.status === 'APPROVED'
                  const statusKey  = isApproved ? 'APPROVED' : (v.status ?? 'PENDING')
                  return (
                    <tr key={v._id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-3 font-medium text-white">{v.companyName}</td>
                      <td className="px-6 py-3 text-zinc-400">{v.contactPerson ?? '—'}</td>
                      <td className="px-6 py-3 text-zinc-400">{v.email ?? '—'}</td>
                      <td className="px-6 py-3 text-zinc-500 font-mono text-xs">{v.gstNumber ?? '—'}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-center">
                          <StarRating rating={v.rating ?? 0} />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[statusKey] ?? 'bg-zinc-500/20 text-zinc-400'
                          }`}
                        >
                          {statusKey}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!isApproved && (
                          <button
                            onClick={() => handleApprove(v._id)}
                            disabled={approvingId === v._id}
                            className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition disabled:opacity-50 flex items-center gap-1"
                          >
                            {approvingId === v._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Approve'
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over: Onboard Vendor */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="w-full max-w-md bg-zinc-950 border-l border-white/[0.06] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <h2 className="font-semibold text-white">Onboard Vendor</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {formError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}
              <p className="text-xs text-zinc-500 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
                If an email is provided, a vendor login account will be automatically created with a temporary password.
              </p>
              {([
                { field: 'companyName',   label: 'Company Name *', type: 'text',  required: true  },
                { field: 'contactPerson', label: 'Contact Person',  type: 'text',  required: false },
                { field: 'email',         label: 'Email (for login)', type: 'email', required: false },
                { field: 'phone',         label: 'Phone',            type: 'tel',   required: false },
                { field: 'gstNumber',     label: 'GST Number',       type: 'text',  required: false },
                { field: 'address',       label: 'Address',          type: 'text',  required: false },
              ] as const).map(({ field, label, type, required }) => (
                <div key={field}>
                  <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  />
                </div>
              ))}
            </form>
            <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.04] text-sm text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Onboard Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
