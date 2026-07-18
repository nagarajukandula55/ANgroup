'use client'

/**
 * Bare-bones admin CRUD for FaultCode master data. Deliberately minimal
 * (per spec: acceptable to leave admin fault-codes UI bare-bones if time-
 * constrained) — a list + add form + deactivate action, no polish.
 */

import { useState, useEffect, useCallback } from 'react'
import { useActiveBusinessId } from "@/hooks/useActiveBusinessId";
import BusinessScopeControl, { type BusinessScopeValue } from "@/components/catalog/BusinessScopeControl";
import { DEVICE_CATEGORIES, DEVICE_CATEGORY_LABELS, type DeviceCategory } from "@/core/catalog/deviceCategory";
import { GroupedCodeTree } from "@/components/shared/GroupedCodeTree";

interface FaultCode {
  _id: string
  code: string
  description: string
  category?: string
  deviceCategory?: DeviceCategory | null
  parentId?: string | null
  isActive: boolean
}

export default function FaultCodesPage() {
  const { businessId } = useActiveBusinessId();
  const [items, setItems] = useState<FaultCode[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'tree'>('tree')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory | ''>('')
  const [parentId, setParentId] = useState('')
  const [scope, setScope] = useState<BusinessScopeValue>({ businessScope: 'SINGLE', businessIds: [] })
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = businessId ? `?businessId=${businessId}` : ''
      const res = await fetch(`/api/fault-codes${qs}`)
      const d = await res.json()
      if (d.success) setItems(d.faultCodes)
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => { load() }, [load])

  async function addCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await fetch('/api/fault-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, description, category, deviceCategory: deviceCategory || null, businessId, parentId: parentId || null, ...scope }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) throw new Error(d.error || 'Failed to add')
      setCode(''); setDescription(''); setCategory(''); setDeviceCategory(''); setParentId(''); setScope({ businessScope: 'SINGLE', businessIds: [] })
      load()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function deactivate(id: string) {
    await fetch(`/api/fault-codes/${id}`, { method: 'DELETE' })
    load()
  }

  async function editItem(item: FaultCode) {
    const newDescription = prompt('Edit description', item.description)
    if (newDescription === null || !newDescription.trim()) return
    await fetch(`/api/fault-codes/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: newDescription.trim() }),
    })
    load()
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Fault Codes</h1>
        <p className="text-sm text-gray-500">
          Master list of device fault / VOC (voice-of-customer) descriptions — populates the
          Fault Code dropdown when logging a CRM appointment or Workorder, so every technician
          picks from the same standardized list instead of free-typing it each time.
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
          <label className="block text-xs text-gray-500 mb-1">Device Type</label>
          <select value={deviceCategory} onChange={(e) => setDeviceCategory(e.target.value as DeviceCategory | '')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Uncategorized</option>
            {DEVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{DEVICE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Component Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Screen, Battery" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Parent (optional)</label>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Top level —</option>
            {items.map((f) => (
              <option key={f._id} value={f._id}>{f.parentId ? `↳ ${f.code}` : f.code} — {f.description}</option>
            ))}
          </select>
        </div>
        <button className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg">Add</button>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl p-4 max-w-sm">
        <BusinessScopeControl value={scope} onChange={setScope} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setView('table')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Table</button>
        <button onClick={() => setView('tree')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'tree' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Tree</button>
      </div>

      {!loading && items.length > 0 && view === 'tree' && (
        <GroupedCodeTree
          items={items.map((f) => ({ ...f, name: `${f.code} — ${f.description}` }))}
          onEdit={(item) => editItem(items.find((f) => f._id === item._id)!)}
          onDelete={(item) => deactivate(item._id)}
        />
      )}

      {view === 'table' && (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Device Type</th>
              <th className="px-4 py-2">Component</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No fault codes</td></tr>
            ) : (
              items.map((f) => (
                <tr key={f._id}>
                  <td className="px-4 py-2 font-mono text-xs">{f.code}</td>
                  <td className="px-4 py-2">{f.description}</td>
                  <td className="px-4 py-2 text-gray-500">{f.deviceCategory ? DEVICE_CATEGORY_LABELS[f.deviceCategory] : '—'}</td>
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
      )}
    </div>
  )
}
