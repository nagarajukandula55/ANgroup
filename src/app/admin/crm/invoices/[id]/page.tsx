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
import { DocumentRenderer, DocumentFooterText } from '@/core/documentTemplates/renderer'
import { salesInvoiceToRenderData } from '@/core/documentTemplates/adapters'
import type { DocumentRenderData } from '@/core/documentTemplates/renderData'

interface InvoiceRaw {
  invoiceNumber: string
  businessId?: string
  warehouseId?: string
  [key: string]: any
}

export default function CrmInvoiceViewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceRaw | null>(null)
  const [renderData, setRenderData] = useState<DocumentRenderData | null>(null)
  const [template, setTemplate] = useState<{ blocks: any[]; accentColor: string; logoUrl?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // The other invoice(s) generated for the same source order -- "B2B2C" is
  // this chain's label (vendor -> AN Group -> end customer), not a
  // separate invoiceType; see dualInvoiceService.ts's getB2B2CChain.
  const [chain, setChain] = useState<{ isB2B2C: boolean; b2b: InvoiceRaw[]; b2c: InvoiceRaw[] } | null>(null)

  useEffect(() => {
    fetch(`/api/sales/invoices/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success && !d.invoice) throw new Error(d.error || d.message || 'Failed to load invoice')
        setInvoice(d.invoice)
      })
      .catch((err) => setError(err.message || 'Could not load invoice'))

    fetch(`/api/sales/invoices/${id}/chain`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setChain(d) })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!invoice?.businessId) {
      if (invoice) setLoading(false)
      return
    }
    const qs = new URLSearchParams({
      businessId: String(invoice.businessId),
      documentType: 'INVOICE',
      ...(invoice.warehouseId ? { warehouseId: String(invoice.warehouseId) } : {}),
    })
    fetch(`/api/document-templates/resolve?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error || 'Failed to load document template')
        setTemplate(d.template)
        setRenderData(salesInvoiceToRenderData(invoice, d.company))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [invoice])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    )
  }

  if (error || !invoice || !renderData || !template) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-red-600 text-sm">{error || 'Invoice not found'}</p>
        <button onClick={() => router.back()} className="text-sm text-gray-500 underline">Back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-[1800px] mx-auto px-6 py-8 print:hidden flex items-center gap-4">
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

      {chain?.isB2B2C && (
        <div className="max-w-3xl mx-auto mb-4 print:hidden rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <span className="font-semibold">Part of a B2B2C chain</span> — this order generated{' '}
          {chain.b2b.length} vendor-side B2B invoice{chain.b2b.length === 1 ? '' : 's'} and{' '}
          {chain.b2c.length} customer-side B2C invoice{chain.b2c.length === 1 ? '' : 's'}:
          <div className="mt-1.5 flex flex-wrap gap-2">
            {[...chain.b2b, ...chain.b2c].filter((inv: any) => inv._id !== invoice._id).map((inv: any) => (
              <a
                key={inv._id}
                href={`/admin/crm/invoices/${inv._id}`}
                className="rounded-lg bg-white border border-amber-200 px-2 py-1 font-mono hover:border-amber-400"
              >
                {inv.invoiceType}: {inv.invoiceNumber}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-10 mb-10 print:border-none print:rounded-none print:shadow-none">
        <DocumentRenderer
          blocks={template.blocks}
          accentColor={template.accentColor}
          logoUrl={template.logoUrl}
          data={renderData}
        />
        <DocumentFooterText text={renderData.footerText} />
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
