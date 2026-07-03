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
} from 'lucide-react'

interface Vendor {
  _id: string
  vendorId?: string
  companyName: string
  contactPerson?: string
  email?: string
  phone?: string
  gstNumber?: string
  rating?: number
  status?: string
  isApproved?: boolean
  address?: string
}

const statusColors: Record<string, string> = {
  APPROVED: 'bg-green-500/20 text-green-400',
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  ACTIVE: 'bg-blue-500/20 text-blue-400',
  INACTIVE: 'bg-gray-100 text-gray-500',
  REJECTED: 'bg-red-500/20 text-red-400',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

export default function VendorsPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    gstNumber: '',
    address: '',
  })

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const d = await res.json()
          const user = d.user ?? d
          const bId = user.activeBusinessId ?? user.businessId ?? null
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
      if (res.ok) {
        const d = await res.json()
        setVendors(Array.isArray(d) ? d : (d.vendors ?? []))
      } else {
        setError('Failed to load vendors')
      }
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true, status: 'APPROVED' }),
      })
      if (res.ok) {
        setVendors((prev) =>
          prev.map((v) => (v._id === id ? { ...v, isApproved: true, status: 'APPROVED' } : v))
        )
      }
    } catch {
      // silently fail
    } finally {
      setApprovingId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, businessId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to onboard vendor')
      }
      setShowForm(false)
      setForm({ companyName: '', contactPerson: '', email: '', phone: '', gstNumber: '', address: '' })
      if (businessId) fetchVendors(businessId)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const total = vendors.length
  const approved = vendors.filter((v) => v.isApproved || v.status === 'APPROVED').length
  const pending = vendors.filter((v) => !v.isApproved && v.status !== 'APPROVED').length
  const active = vendors.filter((v) => v.status === 'ACTIVE').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Vendors</h1>
            <p className="text-sm text-gray-400">Vendor onboarding and management</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-gray-900 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
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
            { icon: Building2, label: 'Total Vendors', value: String(total) },
            { icon: CheckCircle, label: 'Approved', value: String(approved) },
            { icon: Clock, label: 'Pending Approval', value: String(pending) },
            { icon: Star, label: 'Active', value: String(active) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-sm">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-700" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Company</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Contact</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">GST</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Rating</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    No vendors found
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const isApproved = v.isApproved || v.status === 'APPROVED'
                  const statusKey = isApproved ? 'APPROVED' : (v.status ?? 'PENDING')
                  return (
                    <tr key={v._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-gray-900">{v.companyName}</td>
                      <td className="px-6 py-3 text-gray-500">{v.contactPerson ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{v.email ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-400 font-mono text-xs">{v.gstNumber ?? '—'}</td>
                      <td className="px-6 py-3 flex justify-center">
                        <StarRating rating={v.rating ?? 0} />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[statusKey] ?? 'bg-gray-100 text-gray-500'}`}>
                          {statusKey}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!isApproved && (
                          <button
                            onClick={() => handleApprove(v._id)}
                            disabled={approvingId === v._id}
                            className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition disabled:opacity-50"
                          >
                            {approvingId === v._id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
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
          <div className="flex-1 bg-gray-50/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-md bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Onboard Vendor</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
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
              {([
                { field: 'companyName', label: 'Company Name *', type: 'text', required: true },
                { field: 'contactPerson', label: 'Contact Person', type: 'text', required: false },
                { field: 'email', label: 'Email', type: 'email', required: false },
                { field: 'phone', label: 'Phone', type: 'tel', required: false },
                { field: 'gstNumber', label: 'GST Number', type: 'text', required: false },
                { field: 'address', label: 'Address', type: 'text', required: false },
              ] as const).map(({ field, label, type, required }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                  />
                </div>
              ))}
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-gray-900 text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
