'use client'

/**
 * Printable / downloadable view for a SalesInvoice — used by the CRM job
 * sheet closure flow ("Download Invoice" button) and reusable for any
 * SalesInvoice id. Deliberately does NOT depend on the Order/Invoice-model
 * "view" pipeline (app/api/invoice/view/[invoiceNumber]) — that pipeline is
 * a different, incompatible data model from the canonical SalesInvoice this
 * CRM flow writes to. (There used to be a puppeteer-based generateInvoicePDF()
 * service and a matching /api/invoice/download/[id] route that read the PDF
 * back off local disk; both wrote to the server filesystem, which is
 * ephemeral on Vercel's serverless functions, so the download route 404'd
 * unpredictably in production and nothing ever called it — both were removed.)
 *
 * Instead: fetch the SalesInvoice directly (GET /api/sales/invoices/[id],
 * already existed) and render it as print-ready HTML. The user's browser
 * "Print > Save as PDF" is the actual download mechanism — reliable on any
 * host, no server-side PDF renderer or filesystem dependency required.
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'

interface InvoiceItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  taxAmount: number
  total: number
  hsnCode?: string
}

interface Invoice {
  invoiceNumber: string
  customer: { name: string; email?: string; phone?: string; address?: string; gstin?: string }
  items: InvoiceItem[]
  subtotal: number
  taxTotal: number
  discountAmount: number
  grandTotal: number
  cgstTotal?: number
  sgstTotal?: number
  igstTotal?: number
  status: string
  notes?: string
  issueDate: string
  currency: string
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const fmtMoney = (n?: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function CrmInvoiceViewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/sales/invoices/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success && !d.invoice) throw new Error(d.error || d.message || 'Failed to load invoice')
        setInvoice(d.invoice)
      })
      .catch((err) => setError(err.message || 'Could not load invoice'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-red-600 text-sm">{error || 'Invoice not found'}</p>
        <button onClick={() => router.back()} className="text-sm text-gray-500 underline">Back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-8 print:hidden flex items-center gap-4">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-semibold flex-1">Invoice {invoice.invoiceNumber}</h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-10 mb-10 print:border-none print:rounded-none print:shadow-none">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold">TAX INVOICE</h2>
            <p className="text-sm text-gray-500 mt-1">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>Issue Date: {fmtDate(invoice.issueDate)}</p>
            <p>Status: <span className="font-medium text-gray-900">{invoice.status}</span></p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
          <p className="font-medium text-gray-900">{invoice.customer?.name}</p>
          {invoice.customer?.address && <p className="text-sm text-gray-500">{invoice.customer.address}</p>}
          {invoice.customer?.phone && <p className="text-sm text-gray-500">{invoice.customer.phone}</p>}
          {invoice.customer?.email && <p className="text-sm text-gray-500">{invoice.customer.email}</p>}
          {invoice.customer?.gstin && <p className="text-sm text-gray-500">GSTIN: {invoice.customer.gstin}</p>}
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-400">
              <th className="py-2">Description</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Tax</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-center">{item.quantity} {item.unit}</td>
                <td className="py-2 text-right">{fmtMoney(item.unitPrice)}</td>
                <td className="py-2 text-right">{fmtMoney(item.taxAmount)} ({item.taxRate}%)</td>
                <td className="py-2 text-right font-medium">{fmtMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmtMoney(invoice.subtotal)}</span></div>
            {invoice.cgstTotal ? <div className="flex justify-between text-gray-500"><span>CGST</span><span>{fmtMoney(invoice.cgstTotal)}</span></div> : null}
            {invoice.sgstTotal ? <div className="flex justify-between text-gray-500"><span>SGST</span><span>{fmtMoney(invoice.sgstTotal)}</span></div> : null}
            {invoice.igstTotal ? <div className="flex justify-between text-gray-500"><span>IGST</span><span>{fmtMoney(invoice.igstTotal)}</span></div> : null}
            {invoice.discountAmount ? <div className="flex justify-between text-gray-500"><span>Discount</span><span>-{fmtMoney(invoice.discountAmount)}</span></div> : null}
            <div className="flex justify-between font-semibold text-gray-900 text-base border-t border-gray-200 pt-2">
              <span>Grand Total</span><span>{fmtMoney(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400">{invoice.notes}</div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
