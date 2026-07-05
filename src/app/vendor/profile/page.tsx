'use client'

import { useState, useEffect } from 'react'
import {
  Building2,
  AlertCircle,
  Loader2,
  Save,
  CheckCircle,
  Star,
  ShieldCheck,
  Clock,
} from 'lucide-react'

interface VendorProfileData {
  _id: string
  vendorId: string
  companyName: string
  contactPerson: string
  email: string
  phone: string
  gstNumber: string
  panNumber: string
  category: string
  address: {
    street: string
    city: string
    state: string
    pincode: string
  }
  bankDetails: {
    accountName: string
    accountNumber: string
    ifscCode: string
    bankName: string
  }
  isApproved: boolean
  rating: number
  createdAt: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= Math.round(rating)
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-700'
          }`}
        />
      ))}
      <span className="text-sm text-gray-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  type = 'text',
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full bg-white border rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
          readOnly
            ? 'border-gray-100 cursor-not-allowed text-gray-500'
            : 'border-gray-200 focus:border-violet-500/50'
        }`}
      />
    </div>
  )
}

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<VendorProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    gstNumber: '',
    panNumber: '',
    category: '',
    address: { street: '', city: '', state: '', pincode: '' },
    bankDetails: {
      accountName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
    },
  })

  useEffect(() => {
    fetch('/api/vendor/profile')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const p = res.data
          setProfile(p)
          setForm({
            companyName: p.companyName || '',
            contactPerson: p.contactPerson || '',
            phone: p.phone || '',
            gstNumber: p.gstNumber || '',
            panNumber: p.panNumber || '',
            category: p.category || '',
            address: {
              street: p.address?.street || '',
              city: p.address?.city || '',
              state: p.address?.state || '',
              pincode: p.address?.pincode || '',
            },
            bankDetails: {
              accountName: p.bankDetails?.accountName || '',
              accountNumber: p.bankDetails?.accountNumber || '',
              ifscCode: p.bankDetails?.ifscCode || '',
              bankName: p.bankDetails?.bankName || '',
            },
          })
        } else {
          setError(res.message || 'Failed to load profile')
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setSuccess('Profile updated successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(json.message || 'Failed to save')
      }
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const setAddr = (field: string, value: string) => {
    setForm((f) => ({ ...f, address: { ...f.address, [field]: value } }))
  }

  const setBank = (field: string, value: string) => {
    setForm((f) => ({
      ...f,
      bankDetails: { ...f.bankDetails, [field]: value },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest">
          Vendor Portal
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">My Profile</h1>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Read-only info banner */}
      {profile && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                Vendor ID
              </p>
              <p className="text-sm font-mono text-gray-600">
                {profile.vendorId}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                Member Since
              </p>
              <p className="text-sm text-gray-600">
                {new Date(profile.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                Rating
              </p>
              <StarRating rating={profile.rating || 0} />
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                Status
              </p>
              {profile.isApproved ? (
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">Approved</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400">Pending Review</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Company Information */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Company Information
            </h2>
            <p className="text-xs text-gray-500">
              Basic business details
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Company Name"
            value={form.companyName}
            onChange={(v) => setForm((f) => ({ ...f, companyName: v }))}
            placeholder="Your company name"
          />
          <FormField
            label="Contact Person"
            value={form.contactPerson}
            onChange={(v) => setForm((f) => ({ ...f, contactPerson: v }))}
            placeholder="Primary contact name"
          />
          <FormField
            label="Email Address"
            value={profile?.email || ''}
            readOnly
            type="email"
          />
          <FormField
            label="Phone Number"
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="+91 98765 43210"
            type="tel"
          />
          <FormField
            label="GST Number"
            value={form.gstNumber}
            onChange={(v) => setForm((f) => ({ ...f, gstNumber: v }))}
            placeholder="22AAAAA0000A1Z5"
          />
          <FormField
            label="PAN Number"
            value={form.panNumber}
            onChange={(v) => setForm((f) => ({ ...f, panNumber: v }))}
            placeholder="AAAAA0000A"
          />
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1.5">
              Business Category
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-violet-500/50 transition-colors"
            >
              <option value="">
                Select category
              </option>
              <option value="MANUFACTURING">
                Manufacturing
              </option>
              <option value="TRADING">
                Trading
              </option>
              <option value="SERVICES">
                Services
              </option>
              <option value="LOGISTICS">
                Logistics
              </option>
              <option value="TECHNOLOGY">
                Technology
              </option>
              <option value="RETAIL">
                Retail
              </option>
              <option value="OTHER">
                Other
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-5">
          Business Address
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormField
              label="Street Address"
              value={form.address.street}
              onChange={(v) => setAddr('street', v)}
              placeholder="Street / Plot / Area"
            />
          </div>
          <FormField
            label="City"
            value={form.address.city}
            onChange={(v) => setAddr('city', v)}
            placeholder="City"
          />
          <FormField
            label="State"
            value={form.address.state}
            onChange={(v) => setAddr('state', v)}
            placeholder="State"
          />
          <FormField
            label="Pincode"
            value={form.address.pincode}
            onChange={(v) => setAddr('pincode', v)}
            placeholder="400001"
          />
        </div>
      </div>

      {/* Bank Details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Bank Details</h2>
        <p className="text-xs text-gray-500 mb-5">
          Payment will be transferred to this account
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Account Holder Name"
            value={form.bankDetails.accountName}
            onChange={(v) => setBank('accountName', v)}
            placeholder="Name as per bank records"
          />
          <FormField
            label="Bank Name"
            value={form.bankDetails.bankName}
            onChange={(v) => setBank('bankName', v)}
            placeholder="State Bank of India"
          />
          <FormField
            label="Account Number"
            value={form.bankDetails.accountNumber}
            onChange={(v) => setBank('accountNumber', v)}
            placeholder="Account number"
          />
          <FormField
            label="IFSC Code"
            value={form.bankDetails.ifscCode}
            onChange={(v) => setBank('ifscCode', v.toUpperCase())}
            placeholder="SBIN0001234"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
