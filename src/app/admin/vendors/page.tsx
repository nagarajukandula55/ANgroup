'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Plus, X, Building2, CheckCircle,
  Clock, Star, ChevronRight, ChevronLeft, Truck,
} from 'lucide-react'

interface Vendor {
  _id: string
  vendorId?: string
  companyName: string
  contactPerson?: string
  email?: string
  phone?: string
  gstNumber?: string
  panNumber?: string
  category?: string
  paymentTerms?: string
  creditLimit?: number
  rating?: number
  status?: string
  isApproved?: boolean
  address?: { street?: string; city?: string; state?: string; pincode?: string }
  bankDetails?: { accountName?: string; accountNumber?: string; ifscCode?: string; bankName?: string }
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Chandigarh','Puducherry',
]

const CATEGORIES = [
  'Raw Materials','Packaging','Electronics','Machinery','Services',
  'Logistics','IT & Software','Office Supplies','Utilities','Other',
]

const PAYMENT_TERMS = [
  'Immediate','Net 7','Net 15','Net 30','Net 45','Net 60','Net 90',
]

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING:  'bg-yellow-100 text-yellow-700',
  ACTIVE:   'bg-blue-100 text-blue-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  REJECTED: 'bg-red-100 text-red-700',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-3 h-3 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  )
}

const TABS = ['Basic Info', 'Address', 'Bank Details', 'Additional'] as const
type Tab = typeof TABS[number]

const emptyForm = {
  companyName: '', businessType: '', contactPerson: '', email: '',
  phone: '', gstNumber: '', panNumber: '', category: '', paymentTerms: '',
  creditLimit: '',
  street: '', city: '', state: '', pincode: '',
  accountName: '', accountNumber: '', confirmAccount: '', ifscCode: '', bankName: '',
  yearsInBusiness: '', annualTurnover: '', notes: '',
}

export default function VendorsPage() {
  const router  = useRouter()
  const [vendors, setVendors]     = useState<Vendor[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Basic Info')
  const [form, setForm]           = useState({ ...emptyForm })

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        const bId = d.user?.activeBusinessId ?? d.businesses?.[0]?._id ?? null
        setBusinessId(bId)
        if (bId) fetchVendors(bId)
        else setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function fetchVendors(bId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/vendors?businessId=${bId}`)
      if (res.ok) {
        const d = await res.json()
        setVendors(Array.isArray(d) ? d : (d.vendors ?? []))
      } else setError('Failed to load vendors')
    } catch { setError('Failed to connect') }
    finally { setLoading(false) }
  }

  async function handleApprove(id: string) {
    setApprovingId(id)
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true, status: 'APPROVED' }),
      })
      if (res.ok) setVendors(p => p.map(v => v._id === id ? { ...v, isApproved: true, status: 'APPROVED' } : v))
    } catch { /* silent */ }
    finally { setApprovingId(null) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.companyName.trim()) { setFormError('Company name is required'); return }
    if (form.accountNumber && form.accountNumber !== form.confirmAccount) {
      setFormError('Account numbers do not match'); return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        businessId,
        companyName:    form.companyName.trim(),
        businessType:   form.businessType || undefined,
        contactPerson:  form.contactPerson || undefined,
        email:          form.email || undefined,
        phone:          form.phone || undefined,
        gstNumber:      form.gstNumber.trim().toUpperCase() || undefined,
        panNumber:      form.panNumber.trim().toUpperCase() || undefined,
        category:       form.category || undefined,
        paymentTerms:   form.paymentTerms || undefined,
        creditLimit:    form.creditLimit ? Number(form.creditLimit) : undefined,
        address: (form.street || form.city || form.state || form.pincode) ? {
          street:  form.street || undefined,
          city:    form.city   || undefined,
          state:   form.state  || undefined,
          pincode: form.pincode || undefined,
          country: 'India',
        } : undefined,
        bankDetails: form.accountNumber ? {
          accountName:   form.accountName   || undefined,
          accountNumber: form.accountNumber,
          ifscCode:      form.ifscCode.trim().toUpperCase() || undefined,
          bankName:      form.bankName      || undefined,
        } : undefined,
        notes: form.notes || undefined,
      }
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? d.error ?? 'Failed to onboard vendor')
      }
      setShowForm(false)
      setForm({ ...emptyForm })
      setActiveTab('Basic Info')
      if (businessId) fetchVendors(businessId)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  function field(name: keyof typeof emptyForm, label: string, opts: {
    type?: string; required?: boolean; placeholder?: string; hint?: string
  } = {}) {
    const { type = 'text', required = false, placeholder, hint } = opts
    return (
      <div key={name}>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          type={type}
          required={required}
          value={form[name]}
          placeholder={placeholder}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition"
        />
        {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
      </div>
    )
  }

  function select(name: keyof typeof emptyForm, label: string, options: string[], required = false) {
    return (
      <div key={name}>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <select
          required={required}
          value={form[name]}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 transition appearance-none"
        >
          <option value="">Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }

  const stats = [
    { icon: Building2, label: 'Total Vendors',    value: vendors.length },
    { icon: CheckCircle, label: 'Approved',        value: vendors.filter(v => v.isApproved || v.status === 'APPROVED').length },
    { icon: Clock,       label: 'Pending',          value: vendors.filter(v => !v.isApproved && v.status !== 'APPROVED').length },
    { icon: Star,        label: 'Active',           value: vendors.filter(v => v.status === 'ACTIVE').length },
  ]

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Vendors</h1>
            <p className="text-sm text-gray-400 mt-0.5">Vendor onboarding and management</p>
          </div>
          <button onClick={() => { setShowForm(true); setActiveTab('Basic Info') }}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-800 transition">
            <Plus className="w-4 h-4" /> Onboard Vendor
          </button>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <h2 className="font-medium text-gray-700 text-sm">All Vendors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Company</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Contact</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Category</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">GST</th>
                  <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium">Payment Terms</th>
                  <th className="text-center px-6 py-3 text-xs text-gray-400 font-medium">Rating</th>
                  <th className="text-center px-6 py-3 text-xs text-gray-400 font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">No vendors yet. Onboard your first vendor.</p>
                    </td>
                  </tr>
                ) : vendors.map(v => {
                  const isApproved = v.isApproved || v.status === 'APPROVED'
                  const statusKey  = isApproved ? 'APPROVED' : (v.status ?? 'PENDING')
                  return (
                    <tr key={v._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{v.companyName}</p>
                        {v.address?.city && <p className="text-xs text-gray-400">{v.address.city}{v.address.state ? `, ${v.address.state}` : ''}</p>}
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-gray-700">{v.contactPerson ?? '—'}</p>
                        {v.phone && <p className="text-xs text-gray-400">{v.phone}</p>}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{v.category ?? '—'}</td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-500">{v.gstNumber ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{v.paymentTerms ?? '—'}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-center"><StarRating rating={v.rating ?? 0} /></div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[statusKey] ?? 'bg-gray-100 text-gray-500'}`}>
                          {statusKey}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!isApproved && (
                          <button onClick={() => handleApprove(v._id)} disabled={approvingId === v._id}
                            className="px-3 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-medium hover:bg-green-100 transition disabled:opacity-50">
                            {approvingId === v._id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-over form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-lg bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-2xl">

            {/* Form header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Onboard Vendor</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fill in vendor details to add them to your business</p>
              </div>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6 pt-3 gap-1">
              {TABS.map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`pb-2.5 px-2 text-xs font-medium transition border-b-2 -mb-px flex items-center gap-1.5 ${
                    activeTab === tab ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    activeTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>{i + 1}</span>
                  {tab}
                </button>
              ))}
            </div>

            {/* Form content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {formError && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</div>
              )}

              {activeTab === 'Basic Info' && (
                <div className="space-y-4">
                  {field('companyName', 'Company Name', { required: true, placeholder: 'ABC Suppliers Pvt. Ltd.' })}
                  {select('businessType', 'Business Type', ['Manufacturer','Trader','Service Provider','Importer','Distributor'])}
                  <div className="grid grid-cols-2 gap-4">
                    {field('contactPerson', 'Contact Person', { placeholder: 'Full name' })}
                    {field('phone', 'Phone', { type: 'tel', placeholder: '+91 98765 43210' })}
                  </div>
                  {field('email', 'Email Address', { type: 'email', placeholder: 'vendor@company.com' })}
                  <div className="grid grid-cols-2 gap-4">
                    {field('gstNumber', 'GSTIN', { placeholder: '27AABCU9603R1ZX', hint: '15-digit GST Identification Number' })}
                    {field('panNumber', 'PAN Number', { placeholder: 'AABCU9603R', hint: '10-character PAN' })}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {select('category', 'Category', CATEGORIES)}
                    {select('paymentTerms', 'Payment Terms', PAYMENT_TERMS)}
                  </div>
                  {field('creditLimit', 'Credit Limit (₹)', { type: 'number', placeholder: '100000' })}
                </div>
              )}

              {activeTab === 'Address' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Street Address</label>
                    <textarea value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))}
                      rows={2} placeholder="Building, street, area"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {field('city', 'City', { placeholder: 'Mumbai' })}
                    {field('pincode', 'Pincode', { placeholder: '400001', hint: '6-digit PIN code' })}
                  </div>
                  {select('state', 'State', INDIAN_STATES)}
                  <div className="mt-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500">
                    Country is set to <strong>India</strong> by default.
                  </div>
                </div>
              )}

              {activeTab === 'Bank Details' && (
                <div className="space-y-4">
                  <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    Bank details are stored securely and used only for payment processing.
                  </div>
                  {field('bankName', 'Bank Name', { placeholder: 'State Bank of India' })}
                  {field('accountName', 'Account Holder Name', { placeholder: 'ABC Suppliers Pvt. Ltd.' })}
                  {field('ifscCode', 'IFSC Code', { placeholder: 'SBIN0001234', hint: '11-character IFSC code' })}
                  {field('accountNumber', 'Account Number', { type: 'password', placeholder: 'Enter account number' })}
                  {field('confirmAccount', 'Confirm Account Number', { placeholder: 'Re-enter account number' })}
                  {form.accountNumber && form.confirmAccount && form.accountNumber !== form.confirmAccount && (
                    <p className="text-xs text-red-500">Account numbers do not match</p>
                  )}
                  {form.accountNumber && form.confirmAccount && form.accountNumber === form.confirmAccount && (
                    <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Account numbers match</p>
                  )}
                </div>
              )}

              {activeTab === 'Additional' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {field('yearsInBusiness', 'Years in Business', { type: 'number', placeholder: '5' })}
                    {select('annualTurnover', 'Annual Turnover', [
                      'Under ₹25 Lakh', '₹25L – ₹1 Cr', '₹1 Cr – ₹5 Cr',
                      '₹5 Cr – ₹25 Cr', '₹25 Cr – ₹100 Cr', 'Above ₹100 Cr',
                    ])}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Internal Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      rows={4} placeholder="Any internal notes about this vendor..."
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition resize-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
              {/* Back / Next tabs */}
              {activeTab !== 'Basic Info' && (
                <button type="button"
                  onClick={() => setActiveTab(TABS[TABS.indexOf(activeTab) - 1])}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}

              {activeTab !== 'Additional' ? (
                <button type="button"
                  onClick={() => setActiveTab(TABS[TABS.indexOf(activeTab) + 1])}
                  className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : null}

              <button onClick={handleSubmit} disabled={submitting}
                className={`${activeTab !== 'Additional' ? 'px-4' : 'flex-1'} flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50`}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? 'Saving…' : 'Onboard Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
