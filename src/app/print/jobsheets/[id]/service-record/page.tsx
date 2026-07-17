'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  hsnCode?: string
  serviceCenterBOMId?: { partCode?: string; partName?: string; hsnCode?: string }
}

interface JobSheet {
  jobSheetNumber: string
  customerName: string
  phone: string
  product?: string
  brandId?: { name?: string }
  deviceModel?: string
  imeiOrSerialNumber?: string
  issueDescription?: string
  faultCodeId?: { code?: string; description?: string }
  symptomCodeId?: { code?: string; description?: string }
  solutionId?: { code?: string; description?: string }
  remark?: string
  lineItems: LineItem[]
  serviceCharge?: number
  paymentCollected?: number
  assignedTo?: { name?: string; email?: string }
  createdAt: string
  handedOverAt?: string
  status: string
}

interface Vendor {
  companyName?: string
  phone?: string
  address?: { street?: string; city?: string; state?: string; pincode?: string }
  serviceCenterInfo?: { hours?: string; hotline?: string }
}

const fmtMoney = (n: number) =>
  `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function ServiceRecordPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [jobSheet, setJobSheet] = useState<JobSheet | null>(null)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/crm/jobsheets/${id}/service-record`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message || 'Failed to load service record')
        setJobSheet(d.jobSheet)
        setVendor(d.vendor)
      })
      .catch((err) => setError(err.message || 'Failed to load service record'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    )
  }

  if (error || !jobSheet) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">{error || 'Service record not found'}</p>
        <button onClick={() => router.push('/vendor/crm/jobsheets')} className="text-sm text-gray-500 underline">
          Back to Workorders
        </button>
      </div>
    )
  }

  const materialTotal = jobSheet.lineItems.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0)
  const taxTotal = jobSheet.lineItems.reduce(
    (s, l) => s + (l.quantity || 0) * (l.unitPrice || 0) * ((l.taxRate || 0) / 100),
    0
  )
  const totalPaid = materialTotal + taxTotal + (jobSheet.serviceCharge || 0)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-10 print:py-0 print:px-0">
        <div className="flex items-center gap-4 mb-6 print:hidden">
          <button onClick={() => router.push('/vendor/crm/jobsheets')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-semibold flex-1">Service Record</h1>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 print:border-0 print:rounded-none">
          <div className="flex items-start justify-between border-b border-gray-200 pb-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold">{vendor?.companyName || 'Service Record'}</h2>
              <p className="text-xs text-gray-500">RO No.: {jobSheet.jobSheetNumber}</p>
            </div>
            <p className="text-xs text-gray-400">Printed: {fmtDate(new Date().toISOString())}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
            <div><span className="text-gray-500">Customer Name:</span> {jobSheet.customerName}</div>
            <div><span className="text-gray-500">Phone:</span> {jobSheet.phone}</div>
            <div><span className="text-gray-500">Pick-up Date:</span> {fmtDate(jobSheet.createdAt)}</div>
            <div><span className="text-gray-500">Handover Date:</span> {fmtDate(jobSheet.handedOverAt)}</div>
            <div>
              <span className="text-gray-500">Model:</span>{' '}
              {[jobSheet.product, jobSheet.brandId?.name, jobSheet.deviceModel].filter(Boolean).join(' · ') || '—'}
            </div>
            <div><span className="text-gray-500">SN/IMEI:</span> {jobSheet.imeiOrSerialNumber || '—'}</div>
          </div>

          <div className="space-y-1.5 text-sm mb-6 border-t border-gray-100 pt-4">
            <p><span className="text-gray-500">Customer Fault Description:</span> {jobSheet.issueDescription || jobSheet.faultCodeId?.description || '—'}</p>
            <p><span className="text-gray-500">Fault Symptom:</span> {jobSheet.symptomCodeId?.description || '—'}</p>
            <p><span className="text-gray-500">Solution:</span> {jobSheet.solutionId?.description || '—'}</p>
            <p><span className="text-gray-500">Special Instructions:</span> {jobSheet.remark || '—'}</p>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Material Code</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Material Description</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Rate</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Qty</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Tax</th>
                  <th className="text-right px-3 py-2 text-gray-500 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobSheet.lineItems.map((item, i) => {
                  const lineTax = (item.quantity || 0) * (item.unitPrice || 0) * ((item.taxRate || 0) / 100)
                  const lineCost = (item.quantity || 0) * (item.unitPrice || 0) + lineTax
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.serviceCenterBOMId?.partCode || '—'}</td>
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{fmtMoney(lineTax)}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmtMoney(lineCost)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end text-sm space-y-1 mb-6">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Material Total:</span> <span>{fmtMoney(materialTotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax Total:</span> <span>{fmtMoney(taxTotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Repair Labor Cost:</span> <span>{fmtMoney(jobSheet.serviceCharge || 0)}</span></div>
              <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-1.5"><span>Paid Amount:</span> <span>{fmtMoney(totalPaid)}</span></div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 text-xs text-gray-500 space-y-1">
            <p>Technical Consultant: {jobSheet.assignedTo?.name || '—'}</p>
            <p>Authorized Service Partner: {vendor?.companyName || '—'}</p>
            {vendor?.phone && <p>Service Center Phone: {vendor.phone}</p>}
            {vendor?.address && (
              <p>
                Service Center Address:{' '}
                {[vendor.address.street, vendor.address.city, vendor.address.state, vendor.address.pincode].filter(Boolean).join(', ') || '—'}
              </p>
            )}
            {vendor?.serviceCenterInfo?.hours && <p>Service Hours: {vendor.serviceCenterInfo.hours}</p>}
            {vendor?.serviceCenterInfo?.hotline && <p>Official Hotline: {vendor.serviceCenterInfo.hotline}</p>}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-200 text-sm">
            Signature: ______________________________
          </div>
        </div>
      </div>
    </div>
  )
}
