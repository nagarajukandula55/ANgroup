'use client'

/**
 * Bare-bones vendor UI for managing this vendor's ServiceCenterBOM parts
 * (Part Name, HSN, Rate — without tax; partCode is server-generated).
 * Deliberately minimal per spec allowance for a bare-bones list+form.
 */

import { useState, useEffect, useCallback } from 'react'

interface Part {
  _id: string
  partName: string
  partCode: string
  hsnCode: string
  rate: number
  isActive: boolean
}

export default function ServiceCenterBOMPage() {
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [partName, setPartName] = useState('')
  const [hsnCode, setHsnCode] = useState('')
  const [rate, setRate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/service-center-bom')
      const d = await res.json()
      if (d.success) setParts(d.parts)
      else setError(d.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addPart(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/service-center-bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partName, hsnCode, rate: parseFloat(rate) || 0 }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) throw new Error(d.error || 'Failed to add part')
      setPartName(''); setHsnCode(''); setRate('')
      load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function deactivate(id: string) {
    await fetch(`/api/service-center-bom/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Service Center BOM</h1>
        <p className="text-sm text-gray-500">Your part list for estimates and Workorder invoicing. Rate is without tax; tax% is auto-derived from HSN at Workorder close.</p>
      </div>

      <form onSubmit={addPart} className="flex flex-wrap gap-2 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Part Name</label>
          <input required value={partName} onChange={(e) => setPartName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">HSN Code</label>
          <input required value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rate (without tax)</label>
          <input required type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28" />
        </div>
        <button className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg">Add Part</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2">Part Code</th>
              <th className="px-4 py-2">Part Name</th>
              <th className="px-4 py-2">HSN</th>
              <th className="px-4 py-2">Rate</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : parts.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No parts yet</td></tr>
            ) : (
              parts.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-2 font-mono text-xs">{p.partCode}</td>
                  <td className="px-4 py-2">{p.partName}</td>
                  <td className="px-4 py-2 text-gray-500">{p.hsnCode}</td>
                  <td className="px-4 py-2">₹{p.rate}</td>
                  <td className="px-4 py-2">{p.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2">
                    {p.isActive && (
                      <button onClick={() => deactivate(p._id)} className="text-xs text-red-500 hover:underline">Deactivate</button>
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
