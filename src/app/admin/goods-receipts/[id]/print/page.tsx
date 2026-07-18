'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Printer } from 'lucide-react'
import { DocumentRenderer, DocumentFooterText } from '@/core/documentTemplates/renderer'
import { goodsReceiptToRenderData } from '@/core/documentTemplates/adapters'
import type { DocumentRenderData } from '@/core/documentTemplates/renderData'

export default function GoodsReceiptPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [receipt, setReceipt] = useState<any | null>(null)
  const [renderData, setRenderData] = useState<DocumentRenderData | null>(null)
  const [template, setTemplate] = useState<{ blocks: any[]; accentColor: string; logoUrl?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/goods-receipts/${id}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) throw new Error(d.message || 'Goods receipt not found')
        setReceipt(d.data)
      })
      .catch(err => setError(err.message))
  }, [id])

  useEffect(() => {
    if (!receipt) return
    const qs = new URLSearchParams({
      businessId: String(receipt.businessId),
      documentType: 'GRN',
      ...(receipt.warehouseId?._id ? { warehouseId: String(receipt.warehouseId._id) } : {}),
    })
    fetch(`/api/document-templates/resolve?${qs.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) throw new Error(d.error || 'Failed to load document template')
        setTemplate(d.template)
        setRenderData(goodsReceiptToRenderData(receipt, d.company))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [receipt])

  if (error) return <div className="p-10 text-center text-red-500">{error}</div>
  if (loading || !renderData || !template) return <div className="p-10 text-center text-gray-400">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="max-w-[1800px] mx-auto mb-4 flex justify-end print:hidden">
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800">
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none rounded-2xl print:rounded-none p-10">
        <DocumentRenderer
          blocks={template.blocks}
          accentColor={template.accentColor}
          logoUrl={template.logoUrl}
          data={renderData}
        />
        <DocumentFooterText text={renderData.footerText} />
      </div>
    </div>
  )
}
