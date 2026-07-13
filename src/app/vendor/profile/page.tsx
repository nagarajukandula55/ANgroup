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
  termsAndConditions?: string
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
  servicePincodes?: string[]
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
    termsAndConditions: '',
    address: { street: '', city: '', state: '', pincode: '' },
    bankDetails: {
      accountName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
    },
    servicePincodes: [] as string[],
  })

  const [pincodeInput, setPincodeInput] = useState('')
  const [pincodeWarning, setPincodeWarning] = useState('')

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
            termsAndConditions: p.termsAndConditions || '',
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
            servicePincodes: Array.isArray(p.servicePincodes) ? p.servicePincodes : [],
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

  const addServicePincode = async () => {
    const pin = pincodeInput.trim()
    setPincodeWarning('')
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setPincodeWarning('Enter a valid 6-digit pincode')
      return
    }
    if (form.servicePincodes.includes(pin)) {
      setPincodeInput('')
      return
    }
    try {
      const res = await fetch(`/api/pincode/${pin}`)
      const json = await res.json()
      if (json.success && json.found === false) {
        setPincodeWarning(`${pin} not found in pincode master data — added anyway, please double-check`)
      }
    } catch {
      // Lookup failing shouldn't block adding the pincode.
    }
    setForm((f) => ({ ...f, servicePincodes: [...f.servicePincodes, pin] }))
    setPincodeInput('')
  }

  const removeServicePincode = (pin: string) => {
    setForm((f) => ({ ...f, servicePincodes: f.servicePincodes.filter((p) => p !== pin) }))
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
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1.5">
              Service Terms &amp; Conditions
            </label>
            <textarea
              rows={5}
              value={form.termsAndConditions}
              onChange={(e) =>
                setForm((f) => ({ ...f, termsAndConditions: e.target.value }))
              }
              placeholder="Your own service terms and conditions -- shown on your workorder documents"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
            />
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

      {/* Service Pincodes */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Service Area Pincodes</h2>
        <p className="text-xs text-gray-500 mb-4">
          Pincodes where you can attend on-site / service-center visits. Used to route customer appointment requests to you.
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={pincodeInput}
            onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addServicePincode()
              }
            }}
            placeholder="Add a 6-digit pincode"
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            type="button"
            onClick={addServicePincode}
            className="px-4 py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
          >
            Add
          </button>
        </div>
        {pincodeWarning && (
          <p className="text-xs text-amber-600 mb-2">{pincodeWarning}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {form.servicePincodes.length === 0 && (
            <p className="text-xs text-gray-400">No service pincodes added yet.</p>
          )}
          {form.servicePincodes.map((pin) => (
            <span
              key={pin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-xs font-medium text-violet-700"
            >
              {pin}
              <button
                type="button"
                onClick={() => removeServicePincode(pin)}
                className="text-violet-400 hover:text-violet-600"
                aria-label={`Remove ${pin}`}
              >
                ×
              </button>
            </span>
          ))}
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
