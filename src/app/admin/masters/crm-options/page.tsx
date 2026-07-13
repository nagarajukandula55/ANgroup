'use client'

/**
 * Super-admin-only config for the two option lists the New Job Sheet form
 * used to hardcode (Appointment Type: Onsite/Walk-in, Request Type:
 * Repair/Installation) -- per explicit direction, these should be
 * configurable, not baked into the frontend. Bare-bones, same pattern as
 * Fault Codes/Solutions.
 */

import { useState, useEffect, useCallback } from 'react'

interface Option {
  _id: string
  code: string
  label: string
  isActive: boolean
}

const LISTS: { type: 'APPOINTMENT_TYPE' | 'REQUEST_TYPE'; title: string; hint: string }[] = [
  { type: 'APPOINTMENT_TYPE', title: 'Appointment Types', hint: 'Populates the Appointment Type dropdown on the New Job Sheet form (Onsite / Walk-in by default).' },
  { type: 'REQUEST_TYPE', title: 'Request (Repair) Types', hint: 'Populates the Request Type dropdown on the New Job Sheet form (Repair / Installation by default).' },
]

function OptionListEditor({ type, title, hint }: { type: string; title: string; hint: string }) {
  const [items, setItems] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm-option-lists?listType=${type}`)
      const d = await res.json()
      if (d.success) setItems(d.options)
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/crm-option-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listType: type, code, label }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) throw new Error(d.error || 'Failed to add')
      setCode(''); setLabel('')
      load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function deactivate(id: string) {
    await fetch(`/api/crm-option-lists/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>

      <form onSubmit={add} className="flex flex-wrap gap-2 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Code</label>
          <input required value={code} onChange={(e) => setCode(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Label</label>
          <input required value={label} onChange={(e) => setLabel(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg">Add</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No options yet</td></tr>
            ) : (
              items.map((o) => (
                <tr key={o._id}>
                  <td className="px-4 py-2 font-mono text-xs">{o.code}</td>
                  <td className="px-4 py-2">{o.label}</td>
                  <td className="px-4 py-2">{o.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2">
                    {o.isActive && (
                      <button onClick={() => deactivate(o._id)} className="text-xs text-red-500 hover:underline">Deactivate</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function CrmOptionsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">CRM Job Sheet Options</h1>
        <p className="text-sm text-gray-500">Super Admin only — every business shares these lists.</p>
      </div>
      {LISTS.map((l) => (
        <OptionListEditor key={l.type} type={l.type} title={l.title} hint={l.hint} />
      ))}
    </div>
  )
}
