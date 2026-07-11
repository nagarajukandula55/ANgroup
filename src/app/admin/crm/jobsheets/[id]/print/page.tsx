'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Printer } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  hsnCode?: string
}

interface JobSheet {
  jobSheetNumber: string
  customerName: string
  phone: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  title: string
  product?: string
  deviceModel?: string
  imeiOrSerialNumber?: string
  brandId?: { name?: string } | string
  status: string
  createdAt: string
  lineItems: LineItem[]
  workPerformed?: string
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function PrintPageInner() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const docType = searchParams?.get('doc') === 'estimate' ? 'ESTIMATE' : 'WORK ORDER'
  const [job, setJob] = useState<JobSheet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/crm/jobsheets/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setJob(d.jobSheet) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-10 text-center text-gray-400">Loading…</div>
  if (!job) return <div className="p-10 text-center text-red-500">Workorder not found</div>

  const subtotal = job.lineItems.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0)
  const taxTotal = job.lineItems.reduce((s, l) => s + ((l.quantity || 0) * (l.unitPrice || 0)) * ((l.taxRate || 0) / 100), 0)
  const grandTotal = subtotal + taxTotal
  const brandName = typeof job.brandId === 'object' ? job.brandId?.name : undefined

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto mb-4 flex justify-end print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800">
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none rounded-2xl print:rounded-none p-10 text-sm text-gray-900">
        <div className="flex items-start justify-between border-b border-gray-200 pb-6 mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{docType}</h1>
            <p className="text-gray-400 font-mono text-xs mt-1">{job.jobSheetNumber}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Date: {fmtDate(job.createdAt)}</p>
            <p>Status: {job.status.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Customer</p>
            <p className="font-medium">{job.customerName}</p>
            <p className="text-gray-500 text-xs">{job.phone}</p>
            {job.email && <p className="text-gray-500 text-xs">{job.email}</p>}
            {(job.address || job.city) && (
              <p className="text-gray-500 text-xs mt-1">
                {[job.address, job.city, job.state, job.pincode].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Device</p>
            <p className="font-medium">{[job.product, brandName, job.deviceModel].filter(Boolean).join(' · ') || '—'}</p>
            {job.imeiOrSerialNumber && <p className="text-gray-500 text-xs">S/N: {job.imeiOrSerialNumber}</p>}
            <p className="text-gray-500 text-xs mt-1">Issue: {job.title}</p>
          </div>
        </div>

        <table className="w-full text-xs border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-gray-900 text-left">
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2">HSN</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2 text-right">Rate</th>
              <th className="py-2 pr-2 text-right">Tax %</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {job.lineItems.filter(l => l.description?.trim()).map((l, i) => {
              const amt = (l.quantity || 0) * (l.unitPrice || 0)
              const tax = amt * ((l.taxRate || 0) / 100)
              return (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2 pr-2">{l.description}</td>
                  <td className="py-2 pr-2 text-gray-500">{l.hsnCode || '—'}</td>
                  <td className="py-2 pr-2 text-right">{l.quantity} {l.unit}</td>
                  <td className="py-2 pr-2 text-right">₹{l.unitPrice.toLocaleString('en-IN')}</td>
                  <td className="py-2 pr-2 text-right">{l.taxRate}%</td>
                  <td className="py-2 text-right">₹{(amt + tax).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-56 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>₹{taxTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between font-semibold text-sm border-t border-gray-200 pt-1 mt-1"><span>Total</span><span>₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
          </div>
        </div>

        {job.workPerformed && (
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Work Performed</p>
            <p className="text-xs text-gray-700">{job.workPerformed}</p>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 text-[10px] text-gray-400">
          {docType === 'ESTIMATE'
            ? 'This is an estimate, not a final invoice. Prices are subject to change based on actual repair findings.'
            : 'This is a service work order and not a tax invoice.'}
        </div>
      </div>
    </div>
  )
}

export default function PrintPage() {
  return (
    <Suspense fallback={null}>
      <PrintPageInner />
    </Suspense>
  )
}
