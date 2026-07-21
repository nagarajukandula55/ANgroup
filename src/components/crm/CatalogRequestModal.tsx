'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { DeviceCategory } from '@/core/catalog/deviceCategory'

export type CatalogRequestKind = 'BRAND' | 'SERIES' | 'MODEL' | 'VARIANT'

interface Props {
  open: boolean
  onClose: () => void
  businessId: string | null
  kind: CatalogRequestKind
  // Scope fields — pass whichever are relevant for `kind`, per
  // CatalogChangeRequest's schema (category for BRAND; brandId for SERIES/
  // MODEL; seriesId optionally for MODEL; modelId for VARIANT).
  category?: DeviceCategory | ''
  brandId?: string
  seriesId?: string
  modelId?: string
  onSuccess?: () => void
}

const KIND_LABEL: Record<CatalogRequestKind, string> = {
  BRAND: 'Brand',
  SERIES: 'Series',
  MODEL: 'Model',
  VARIANT: 'Variant',
}

// Lightweight submit-a-catalog-request modal, opened from the "Can't find
// it? Request to add" link next to the Brand/Series/Model/Variant pickers
// on the CRM call/jobsheet creation forms. Posts to /api/catalog/requests
// (kind is fixed by which dropdown the user was trying to fill) and shows
// a plain inline success/error message -- same visual language as the
// surrounding forms (rounded-xl white card, red-50 error banner).
export function CatalogRequestModal({ open, onClose, businessId, kind, category, brandId, seriesId, modelId, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) {
      setError('Could not determine your business — try reloading the page.')
      return
    }
    if (!name.trim()) {
      setError('Enter a name.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/catalog/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, kind, name: name.trim(), category: category || undefined, brandId: brandId || undefined, seriesId: seriesId || undefined, modelId: modelId || undefined }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to submit request')
      setSuccess(true)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setName('')
    setError(null)
    setSuccess(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Request to add a {KIND_LABEL[kind]}</h3>
          <button type="button" onClick={handleClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              Sent for approval. An admin will review this request.
            </div>
            <button type="button" onClick={handleClose} className="w-full px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">{KIND_LABEL[kind]} name *</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                placeholder={`e.g. New ${KIND_LABEL[kind].toLowerCase()} name`}
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
