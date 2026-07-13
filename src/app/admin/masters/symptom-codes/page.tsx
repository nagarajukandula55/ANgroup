'use client'

/**
 * Bare-bones admin CRUD for SymptomCode master data -- same pattern as
 * /admin/masters/fault-codes, separate list per explicit direction
 * ("make one more list as Symptom code list and add that to repair flow
 * page").
 */

import { useState, useEffect, useCallback } from 'react'
import { useActiveBusinessId } from "@/hooks/useActiveBusinessId";
import BusinessScopeControl, { type BusinessScopeValue } from "@/components/catalog/BusinessScopeControl";

interface SymptomCode {
  _id: string
  code: string
  description: string
  category?: string
  isActive: boolean
}

export default function SymptomCodesPage() {
  const { businessId } = useActiveBusinessId();
  const [items, setItems] = useState<SymptomCode[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [scope, setScope] = useState<BusinessScopeValue>({ businessScope: 'SINGLE', businessIds: [] })
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = businessId ? `?businessId=${businessId}` : ''
      const res = await fetch(`/api/symptom-codes${qs}`)
      const d = await res.json()
      if (d.success) setItems(d.symptomCodes)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  async function addCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/symptom-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, description, category, businessId, ...scope }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) throw new Error(d.error || 'Failed to add')
      setCode(''); setDescription(''); setCategory(''); setScope({ businessScope: 'SINGLE', businessIds: [] })
      load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function deactivate(id: string) {
    await fetch(`/api/symptom-codes/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Symptom Codes</h1>
        <p className="text-sm text-gray-500">
          Master list of observed symptoms — separate from Fault Codes, used in the repair flow
          on the workorder detail page to record what was observed distinct from the diagnosed
          fault.
        </p>
      </div>

      <form onSubmit={addCode} className="flex flex-wrap gap-2 items-end bg-white border border-gray-200 rounded-xl p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Code</label>
          <input required value={code} onChange={(e) => setCode(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Description</label>
          <input required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg">Add</button>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-sm">
        <BusinessScopeControl value={scope} onChange={setScope} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No symptom codes</td></tr>
            ) : (
              items.map((f) => (
                <tr key={f._id}>
                  <td className="px-4 py-2 font-mono text-xs">{f.code}</td>
                  <td className="px-4 py-2">{f.description}</td>
                  <td className="px-4 py-2 text-gray-500">{f.category || '—'}</td>
                  <td className="px-4 py-2">{f.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2">
                    {f.isActive && (
                      <button onClick={() => deactivate(f._id)} className="text-xs text-red-500 hover:underline">Deactivate</button>
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
