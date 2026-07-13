'use client'

/**
 * Full vendor detail page — replaces the old VendorDetailModal side-popup
 * for actually viewing a vendor (the modal is still used elsewhere for the
 * approve/reject/finalize review workflow on pending applications; this
 * page is the professional, permanent record view for an onboarded vendor:
 * facility IDs, current staff roster, agreement status, documents).
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Loader2, Building2, Store, Warehouse, Wrench,
  Users, FileText, CreditCard, MapPin, ShieldCheck, Plus, X,
} from 'lucide-react'

interface StaffMember {
  _id: string
  userId?: { _id: string; name?: string; email?: string; username?: string }
  vendorRole?: string
  memberType?: string
  status?: string
  joinedAt?: string
}

interface VendorData {
  _id: string
  vendorId?: string
  companyName: string
  contactPerson?: string
  email?: string
  phone?: string
  gstNumber?: string
  panNumber?: string
  category?: string
  businessType?: string
  paymentTerms?: string
  creditLimit?: number
  rating?: number
  status?: string
  isApproved?: boolean
  businessId?: string | { _id: string; name?: string; legalName?: string; brandName?: string }
  address?: { street?: string; city?: string; state?: string; pincode?: string }
  bankDetails?: { accountName?: string; accountNumber?: string; ifscCode?: string; bankName?: string }
  documents?: {
    passbookUrl?: string
    gstCertificateUrl?: string
    compliance?: Record<string, { url?: string; label?: string; number?: string }>
  }
  agreementId?: string
  enableStoreFront?: boolean
  enableServiceCenter?: boolean
  enableWarehouse?: boolean
  storeFrontId?: string | null
  serviceCenterId?: string | null
  warehouseFacilityId?: string | null
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-blue-100 text-blue-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  REJECTED: 'bg-red-100 text-red-700',
  AGREEMENT_SIGNED: 'bg-indigo-100 text-indigo-700',
  AGREEMENT_DRAFTED: 'bg-indigo-100 text-indigo-700',
}

function businessLabel(businessId: VendorData['businessId']): string {
  if (!businessId) return '—'
  if (typeof businessId === 'string') return businessId
  return businessId.brandName || businessId.legalName || businessId.name || businessId._id
}

function FacilityCard({
  icon: Icon,
  label,
  enabled,
  facilityId,
}: {
  icon: React.ElementType
  label: string
  enabled?: boolean
  facilityId?: string | null
}) {
  return (
    <div className={`rounded-2xl border p-5 ${enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'bg-gray-900' : 'bg-gray-200'}`}>
          <Icon className={`w-5 h-5 ${enabled ? 'text-white' : 'text-gray-400'}`} />
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
          enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
        }`}>
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-400 mt-1 font-mono">
        {enabled ? (facilityId || 'ID pending…') : '—'}
      </p>
    </div>
  )
}

export default function VendorDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [vendor, setVendor] = useState<VendorData | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [staffLoading, setStaffLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const [showAddStaff, setShowAddStaff] = useState(false)
  const [staffUsername, setStaffUsername] = useState('')
  const [staffRoleInput, setStaffRoleInput] = useState('')
  const [addingStaff, setAddingStaff] = useState(false)
  const [staffError, setStaffError] = useState<string | null>(null)

  const fetchVendor = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/vendors/${id}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to load vendor')
      setVendor(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true)
    try {
      const res = await fetch(`/api/admin/vendor-staff?vendorId=${id}`)
      const data = await res.json()
      if (res.ok && data.success) setStaff(data.staff || [])
    } catch {
      /* non-fatal — staff section just stays empty */
    } finally {
      setStaffLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    fetchVendor()
    fetchStaff()
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsSuperAdmin(!!d.user?.isSuperAdmin))
      .catch(() => {})
  }, [id, fetchVendor, fetchStaff])

  async function handleAddStaff() {
    if (!staffUsername.trim() || !staffRoleInput.trim()) {
      setStaffError('Enter both a user ID and a role')
      return
    }
    setAddingStaff(true)
    setStaffError(null)
    try {
      const res = await fetch('/api/admin/vendor-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: staffUsername.trim(), vendorId: id, vendorRole: staffRoleInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add staff member')
      setStaffUsername('')
      setStaffRoleInput('')
      setShowAddStaff(false)
      fetchStaff()
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setAddingStaff(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{error || 'Vendor not found'}</p>
          <button
            onClick={() => router.push('/admin/vendors')}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Back to Vendors
          </button>
        </div>
      </div>
    )
  }

  const isApproved = vendor.isApproved || vendor.status === 'APPROVED'
  const statusKey = isApproved ? 'APPROVED' : (vendor.status ?? 'PENDING')
  const rowCls = 'flex justify-between py-2.5 border-b border-gray-100 last:border-0'
  const labelCls = 'text-xs text-gray-400'
  const valueCls = 'text-sm text-gray-900 font-medium'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <button
            onClick={() => router.push('/admin/vendors')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition shrink-0 mt-1"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-gray-900">{vendor.companyName}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[statusKey] ?? 'bg-gray-100 text-gray-500'}`}>
                {statusKey}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1 font-mono">
              {vendor.vendorId || 'No vendor ID assigned yet'} · {businessLabel(vendor.businessId)}
            </p>
          </div>
          <button
            onClick={() => router.push(`/admin/vendors/${id}/coverage`)}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition shrink-0"
          >
            Service Area Coverage
          </button>
        </div>

        {/* Facility IDs — the headline ask: show where StoreFront/Warehouse
            were enabled and what real, generated ID each got. */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Facilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FacilityCard icon={Store} label="Store Front" enabled={vendor.enableStoreFront} facilityId={vendor.storeFrontId} />
            <FacilityCard icon={Wrench} label="Service Center" enabled={vendor.enableServiceCenter} facilityId={vendor.serviceCenterId} />
            <FacilityCard icon={Warehouse} label="Warehouse" enabled={vendor.enableWarehouse} facilityId={vendor.warehouseFacilityId} />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — details */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Company Details
              </h2>
              <div className={rowCls}><span className={labelCls}>Contact Person</span><span className={valueCls}>{vendor.contactPerson || '—'}</span></div>
              <div className={rowCls}><span className={labelCls}>Email</span><span className={valueCls}>{vendor.email || '—'}</span></div>
              <div className={rowCls}><span className={labelCls}>Phone</span><span className={valueCls}>{vendor.phone || '—'}</span></div>
              <div className={rowCls}><span className={labelCls}>Category</span><span className={valueCls}>{vendor.category || '—'}</span></div>
              <div className={rowCls}><span className={labelCls}>Business Type</span><span className={valueCls}>{vendor.businessType || '—'}</span></div>
              <div className={rowCls}><span className={labelCls}>Payment Terms</span><span className={valueCls}>{vendor.paymentTerms || '—'}</span></div>
              <div className={rowCls}><span className={labelCls}>Credit Limit</span><span className={valueCls}>{vendor.creditLimit ? `₹${vendor.creditLimit.toLocaleString('en-IN')}` : '—'}</span></div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Address
              </h2>
              {vendor.address && (vendor.address.street || vendor.address.city) ? (
                <p className="text-sm text-gray-900">
                  {[vendor.address.street, vendor.address.city, vendor.address.state, vendor.address.pincode].filter(Boolean).join(', ')}
                </p>
              ) : (
                <p className="text-sm text-gray-400">No address on file</p>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Compliance
              </h2>
              <div className={rowCls}><span className={labelCls}>GSTIN</span><span className={`${valueCls} font-mono`}>{vendor.gstNumber || '—'}</span></div>
              <div className={rowCls}><span className={labelCls}>PAN</span><span className={`${valueCls} font-mono`}>{vendor.panNumber || '—'}</span></div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Bank Details
              </h2>
              <div className={rowCls}><span className={labelCls}>Bank</span><span className={valueCls}>{vendor.bankDetails?.bankName || '—'}</span></div>
              <div className={rowCls}><span className={labelCls}>Account Number</span><span className={`${valueCls} font-mono`}>{vendor.bankDetails?.accountNumber || '—'}</span></div>
              <div className={rowCls}><span className={labelCls}>IFSC</span><span className={`${valueCls} font-mono`}>{vendor.bankDetails?.ifscCode || '—'}</span></div>
            </section>

            {vendor.documents && (vendor.documents.passbookUrl || vendor.documents.gstCertificateUrl || Object.keys(vendor.documents.compliance || {}).length > 0) && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Documents
                </h2>
                <div className="space-y-2">
                  {vendor.documents.passbookUrl && (
                    <a href={vendor.documents.passbookUrl} target="_blank" rel="noreferrer" className="block text-sm text-cyan-700 hover:underline">Bank Passbook / Cancelled Cheque</a>
                  )}
                  {vendor.documents.gstCertificateUrl && (
                    <a href={vendor.documents.gstCertificateUrl} target="_blank" rel="noreferrer" className="block text-sm text-cyan-700 hover:underline">GST Certificate</a>
                  )}
                  {Object.entries(vendor.documents.compliance || {}).map(([key, doc]) => (
                    doc.url ? (
                      <a key={key} href={doc.url} target="_blank" rel="noreferrer" className="block text-sm text-cyan-700 hover:underline">
                        {doc.label || key.replace(/_/g, ' ')}
                      </a>
                    ) : null
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column — staff roster */}
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Staff ({staff.length})
                </h2>
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowAddStaff((s) => !s)}
                    className="w-6 h-6 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"
                  >
                    {showAddStaff ? <X className="w-3.5 h-3.5 text-gray-500" /> : <Plus className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                )}
              </div>

              {showAddStaff && (
                <div className="mb-4 rounded-xl border border-gray-200 p-3 space-y-2">
                  {staffError && <p className="text-xs text-red-600">{staffError}</p>}
                  <input
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="User ID"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition"
                  />
                  <input
                    value={staffRoleInput}
                    onChange={(e) => setStaffRoleInput(e.target.value)}
                    placeholder="Role (e.g. Warehouse Manager)"
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition"
                  />
                  <button
                    onClick={handleAddStaff}
                    disabled={addingStaff}
                    className="w-full py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    {addingStaff ? 'Adding…' : 'Add Staff Member'}
                  </button>
                </div>
              )}

              {staffLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>
              ) : staff.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No staff added yet</p>
              ) : (
                <div className="space-y-2">
                  {staff.map((s) => (
                    <div key={s._id} className="rounded-xl border border-gray-100 px-3 py-2.5">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.userId?.name || s.userId?.username || s.userId?.email || 'Unknown user'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{s.userId?.email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {s.vendorRole && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s.vendorRole}</span>
                        )}
                        {s.memberType && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{s.memberType}</span>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {s.status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
