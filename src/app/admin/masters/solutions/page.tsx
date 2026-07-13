'use client'

import { useState, useEffect, useCallback } from 'react'
import { useActiveBusinessId } from "@/hooks/useActiveBusinessId";
import BusinessScopeControl, { type BusinessScopeValue } from "@/components/catalog/BusinessScopeControl";

interface Solution {
  _id: string
  code: string
  description: string
  category?: string
  isActive: boolean
}

export default function SolutionsPage() {
  const { businessId } = useActiveBusinessId();
  const [items, setItems] = useState<Solution[]>([])
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
      const res = await fetch(`/api/solutions${qs}`)
      const d = await res.json()
      if (d.success) setItems(d.solutions)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  async function addSolution(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/solutions', {
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
    await fetch(`/api/solutions/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Solutions</h1>
        <p className="text-sm text-gray-500">
          Master list of standard repair/resolution descriptions — populates the Solution
          dropdown when closing out a CRM Workorder, so resolutions are recorded consistently
          across every technician instead of free-typed each time.
        </p>
      </div>

      <form onSubmit={addSolution} className="flex flex-wrap gap-2 items-end bg-white border border-gray-200 rounded-xl p-4">
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
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No solutions</td></tr>
            ) : (
              items.map((s) => (
                <tr key={s._id}>
                  <td className="px-4 py-2 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-2">{s.description}</td>
                  <td className="px-4 py-2 text-gray-500">{s.category || '—'}</td>
                  <td className="px-4 py-2">{s.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2">
                    {s.isActive && (
                      <button onClick={() => deactivate(s._id)} className="text-xs text-red-500 hover:underline">Deactivate</button>
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
