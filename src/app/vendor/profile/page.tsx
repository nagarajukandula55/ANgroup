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

  // Business-level settings only an Owner or Manager can see/change --
  // GET 403s for any other staff role, so canManageSettings just stays
  // false and the section below never renders for them.
  const [canManageSettings, setCanManageSettings] = useState(false)
  const [inventorySerialized, setInventorySerialized] = useState(false)
  const [termsAndConditions, setTermsAndConditions] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  // Default Labour Charge -- fallback rate for the workorder page's "Add
  // Labour Charge" line, per explicit direction ("Add Labour charge key
  // must add charges set by manager or owner"). Owner/Manager only, same
  // section as the rest of Business Settings.
  const [defaultLabourCharge, setDefaultLabourCharge] = useState('0')
  const [savingLabourCharge, setSavingLabourCharge] = useState(false)
  // Customer Logo -- shown on the Intake Receipt/Workorder print in place
  // of the device brand's own logo/name, per explicit direction (that
  // document should never show the device manufacturer's branding).
  // Blank = no logo prints at all.
  const [customerLogoUrl, setCustomerLogoUrl] = useState('')
  const [savingCustomerLogo, setSavingCustomerLogo] = useState(false)
  // Service Record settings -- printed on the document generated after
  // closing a job sheet (see /vendor/crm/jobsheets/[id]/service-record).
  // Owner/Manager only, same as the rest of this section.
  const [serviceHours, setServiceHours] = useState('')
  const [serviceHotline, setServiceHotline] = useState('')
  const [savingServiceRecord, setSavingServiceRecord] = useState(false)
  const [serviceRecordMessage, setServiceRecordMessage] = useState('')

  // Team & Access -- every user Super Admin (or the vendor) attached to
  // this vendor, with per-module access checkboxes the Owner/Manager
  // controls directly ("vendor can give either single access to user or
  // multiple access"). Backed by /api/vendor/team.
  interface TeamMember { userId: string; name?: string; email?: string; username?: string; isOwner: boolean; isManager: boolean; modules: string[] }
  interface AccessModule { key: string; label: string; description?: string }
  const [team, setTeam] = useState<TeamMember[]>([])
  const [availableModules, setAvailableModules] = useState<AccessModule[]>([])
  const [teamSaving, setTeamSaving] = useState<string | null>(null)
  const [teamMessage, setTeamMessage] = useState('')

  async function loadTeam() {
    try {
      const res = await fetch('/api/vendor/team')
      const d = await res.json()
      if (d.success) {
        setTeam(d.team || [])
        setAvailableModules(d.availableModules || [])
      }
    } catch { /* section stays hidden for non-managers */ }
  }

  useEffect(() => {
    fetch('/api/vendor/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCanManageSettings(true)
          setInventorySerialized(Boolean(d.inventorySerialized))
          setTermsAndConditions(d.termsAndConditions || '')
          setDefaultLabourCharge(String(d.defaultLabourCharge ?? 0))
          setCustomerLogoUrl(d.customerLogoUrl || '')
        }
      })
      .catch(() => {})
    loadTeam()
  }, [])

  function toggleMemberModule(userId: string, moduleKey: string) {
    setTeam((prev) => prev.map((m) => {
      if (m.userId !== userId) return m
      const has = m.modules.includes(moduleKey)
      return { ...m, modules: has ? m.modules.filter((k) => k !== moduleKey) : [...m.modules, moduleKey] }
    }))
  }

  async function saveMemberAccess(member: TeamMember) {
    setTeamSaving(member.userId)
    setTeamMessage('')
    try {
      const res = await fetch('/api/vendor/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.userId, modules: member.modules, isManager: member.isManager }),
      })
      const d = await res.json()
      setTeamMessage(d.success ? `Saved access for ${member.name || member.email}.` : d.error || 'Failed to save.')
      if (d.success) loadTeam()
    } catch {
      setTeamMessage('Failed to save.')
    } finally {
      setTeamSaving(null)
    }
  }

  async function saveInventorySetting(value: boolean) {
    setSavingSettings(true)
    setSettingsMessage('')
    try {
      const res = await fetch('/api/vendor/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventorySerialized: value }),
      })
      const d = await res.json()
      if (d.success) {
        setInventorySerialized(value)
        setSettingsMessage('Saved.')
      } else {
        setSettingsMessage(d.error || 'Failed to save.')
      }
    } catch {
      setSettingsMessage('Failed to save.')
    } finally {
      setSavingSettings(false)
    }
  }

  async function saveLabourCharge() {
    const value = parseFloat(defaultLabourCharge) || 0
    setSavingLabourCharge(true)
    setSettingsMessage('')
    try {
      const res = await fetch('/api/vendor/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultLabourCharge: value }),
      })
      const d = await res.json()
      setSettingsMessage(d.success ? 'Saved.' : d.error || 'Failed to save.')
    } catch {
      setSettingsMessage('Failed to save.')
    } finally {
      setSavingLabourCharge(false)
    }
  }

  async function saveCustomerLogo() {
    setSavingCustomerLogo(true)
    setSettingsMessage('')
    try {
      const res = await fetch('/api/vendor/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerLogoUrl }),
      })
      const d = await res.json()
      setSettingsMessage(d.success ? 'Saved.' : d.error || 'Failed to save.')
    } catch {
      setSettingsMessage('Failed to save.')
    } finally {
      setSavingCustomerLogo(false)
    }
  }

  // Terms & Conditions -- shown on this business's workorder, estimate and
  // invoice pages/prints. Saved separately (own button) from the
  // inventory toggle above since it's a text field, not a flip-and-save.
  async function saveTerms() {
    setSavingSettings(true)
    setSettingsMessage('')
    try {
      const res = await fetch('/api/vendor/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsAndConditions }),
      })
      const d = await res.json()
      setSettingsMessage(d.success ? 'Saved.' : d.error || 'Failed to save.')
    } catch {
      setSettingsMessage('Failed to save.')
    } finally {
      setSavingSettings(false)
    }
  }

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
          setServiceHours(p.serviceCenterInfo?.hours || '')
          setServiceHotline(p.serviceCenterInfo?.hotline || '')
        } else {
          setError(res.message || 'Failed to load profile')
        }
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  async function saveServiceRecordInfo() {
    setSavingServiceRecord(true)
    setServiceRecordMessage('')
    try {
      const res = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceCenterInfo: { hours: serviceHours, hotline: serviceHotline } }),
      })
      const d = await res.json()
      setServiceRecordMessage(d.success ? 'Saved.' : d.message || 'Failed to save.')
    } catch {
      setServiceRecordMessage('Failed to save.')
    } finally {
      setSavingServiceRecord(false)
    }
  }

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

      {/* Business Settings -- Owner/Manager only */}
      {canManageSettings && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Business Settings</h2>
          <p className="text-xs text-gray-500 mb-5">
            Owner/Manager only -- affects the whole business, not just your account.
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inventorySerialized}
              disabled={savingSettings}
              onChange={(e) => saveInventorySetting(e.target.checked)}
              className="w-4 h-4 mt-0.5"
            />
            <span className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">Serialized Inventory</span> — check real stock and
              deduct on workorder close. When off, part selection just pulls from the Service Center BOM price
              list with no live stock check.
            </span>
          </label>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-900 mb-1">Default Labour Charge</label>
            <p className="text-xs text-gray-500 mb-2">
              Rate used by the workorder page's "Add Labour Charge" button when this vendor has no
              Labour-type Service Center BOM entry of its own.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">₹</span>
              <input
                type="number"
                min={0}
                value={defaultLabourCharge}
                onChange={(e) => setDefaultLabourCharge(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
              <button
                onClick={saveLabourCharge}
                disabled={savingLabourCharge}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {savingLabourCharge ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-900 mb-1">Customer Logo</label>
            <p className="text-xs text-gray-500 mb-2">
              Shown on the Intake Receipt/Workorder print instead of the device brand's own logo -- that
              document never shows the manufacturer's branding. Leave blank for no logo at all.
            </p>
            <div className="flex items-center gap-3">
              {customerLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customerLogoUrl} alt="Customer logo preview" className="h-10 w-auto max-w-[120px] object-contain border border-gray-200 rounded-lg bg-white p-1" />
              ) : (
                <div className="h-10 w-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-[10px] text-gray-400">None</div>
              )}
              <input
                type="url"
                value={customerLogoUrl}
                onChange={(e) => setCustomerLogoUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
              <button
                onClick={saveCustomerLogo}
                disabled={savingCustomerLogo}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {savingCustomerLogo ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-900 mb-1">Terms &amp; Conditions</label>
            <p className="text-xs text-gray-500 mb-2">
              Shown on this business's workorder, estimate and invoice pages/prints.
            </p>
            <textarea
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              rows={5}
              placeholder="e.g. Payment due within 7 days of invoice. Warranty does not cover physical/liquid damage..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            <button
              onClick={saveTerms}
              disabled={savingSettings}
              className="mt-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {savingSettings ? 'Saving…' : 'Save Terms & Conditions'}
            </button>
          </div>

          {settingsMessage && <p className="text-xs text-gray-500 mt-2">{settingsMessage}</p>}

          <div className="mt-5 pt-5 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-900 mb-1">Service Record Details</label>
            <p className="text-xs text-gray-500 mb-2">
              Printed on the Service Record generated after closing a job sheet, alongside your company name/address/phone above.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Service Hours"
                value={serviceHours}
                onChange={setServiceHours}
                placeholder="10:00-13:00 14:00-19:00 (Week Off: Sunday)"
              />
              <FormField
                label="Official Hotline"
                value={serviceHotline}
                onChange={setServiceHotline}
                placeholder="18001028411"
              />
            </div>
            <button
              onClick={saveServiceRecordInfo}
              disabled={savingServiceRecord}
              className="mt-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {savingServiceRecord ? 'Saving…' : 'Save Service Record Details'}
            </button>
            {serviceRecordMessage && <p className="text-xs text-gray-500 mt-2">{serviceRecordMessage}</p>}
          </div>
        </div>
      )}

      {/* Team & Access -- Owner/Manager only. Every user attached to this
          vendor (by Super Admin or the vendor), each with per-module
          access checkboxes. Access takes effect on the member's next
          page load / login. */}
      {team.length > 0 && availableModules.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Team &amp; Access</h2>
          <p className="text-xs text-gray-500 mb-4">
            Users attached to your vendor. Tick the modules each person may use — one or many — then save.
            &quot;Manager&quot; grants full access plus the ability to manage this team.
          </p>
          {teamMessage && (
            <div className="mb-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">{teamMessage}</div>
          )}
          <div className="space-y-4">
            {team.map((member) => (
              <div key={member.userId} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.name || member.email}
                      {member.isOwner && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">Owner</span>}
                      {member.isManager && !member.isOwner && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Manager</span>}
                    </p>
                    <p className="text-xs text-gray-400">{member.username || member.email}</p>
                  </div>
                  {!member.isOwner && (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={member.isManager}
                          onChange={(e) => setTeam((prev) => prev.map((m) => m.userId === member.userId ? { ...m, isManager: e.target.checked } : m))}
                          className="w-3.5 h-3.5"
                        />
                        Manager
                      </label>
                      <button
                        onClick={() => saveMemberAccess(member)}
                        disabled={teamSaving === member.userId}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
                      >
                        {teamSaving === member.userId ? 'Saving…' : 'Save Access'}
                      </button>
                    </div>
                  )}
                </div>
                {member.isOwner ? (
                  <p className="text-xs text-gray-400">The Owner always has full access to every available module.</p>
                ) : member.isManager ? (
                  <p className="text-xs text-gray-400">Managers have full access to every available module. Untick Manager to grant specific modules instead.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {availableModules.map((mod) => (
                      <label key={mod.key} title={mod.description} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer rounded-lg border border-gray-100 px-2 py-1.5 hover:border-gray-300">
                        <input
                          type="checkbox"
                          checked={member.modules.includes(mod.key)}
                          onChange={() => toggleMemberModule(member.userId, mod.key)}
                          className="w-3.5 h-3.5"
                        />
                        {mod.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
