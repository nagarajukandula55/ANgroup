'use client'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout'
import { Users, Plus, Search, Edit2, Trash2, Shield, Mail, Clock } from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', role: 'STAFF' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/users', { credentials: 'include' })
    const d = await res.json()
    if (d.success) setUsers(d.users || [])
    setLoading(false)
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!d.success) { setError(d.message); return }
      setShowCreate(false)
      setForm({ name: '', email: '', username: '', password: '', role: 'STAFF' })
      load()
    } catch { setError('Failed to create user') }
    finally { setCreating(false) }
  }

  async function toggleActive(userId: string, isActive: boolean) {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isActive: !isActive }),
    })
    load()
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="space-y-5 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Admin</p>
            <h1 className="text-2xl font-bold text-white">Users</h1>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary rounded-xl px-4 py-2 text-sm flex items-center gap-2">
            <Plus size={14} /> New User
          </button>
        </div>

        {showCreate && (
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Create User</h3>
            <form onSubmit={createUser} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Full Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required
                  placeholder="Full name" className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                  placeholder="email@angroup.com" className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Username</label>
                <input value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  placeholder="username" className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
                  placeholder="••••••••" className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Role *</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none">
                  {['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" disabled={creating}
                  className="btn-primary rounded-xl px-4 py-2 text-sm flex-1 disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="btn-secondary rounded-xl px-3 py-2 text-sm">Cancel</button>
              </div>
            </form>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
            <Search size={14} className="text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none" />
            <span className="text-xs text-zinc-600">{filtered.length} users</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-zinc-600 text-sm">Loading users…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">No users found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.04]">
                {['User', 'Username', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-zinc-600">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={i} className="border-t border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{u.name}</p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-zinc-400">{u.username || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${u.role === 'SUPER_ADMIN' ? 'badge-info' : u.role === 'ADMIN' ? 'badge-pending' : 'badge-active'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${u.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-zinc-500">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleActive(u._id, u.isActive)}
                          className="text-xs text-zinc-500 hover:text-white transition-all">
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}
