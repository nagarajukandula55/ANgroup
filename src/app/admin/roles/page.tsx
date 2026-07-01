'use client'

import { useEffect, useState } from 'react'
import { Shield, Plus, Edit2, Trash2, Check, X, Users, Lock, Eye, EyeOff, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface Permission { key: string; label: string; description: string }
interface Role {
  id: string; name: string; description: string; color: string;
  isSystem: boolean; userCount: number; permissions: string[]; createdAt: string;
}

const ALL_PERMISSIONS: { group: string; items: Permission[] }[] = [
  { group: 'Platform', items: [
    { key: 'platform.view_dashboard',  label: 'View Dashboard',   description: 'Access main dashboard' },
    { key: 'platform.manage_settings', label: 'Manage Settings',  description: 'Change platform settings' },
  ]},
  { group: 'ERP', items: [
    { key: 'erp.view_inventory',   label: 'View Inventory',   description: 'Browse inventory items' },
    { key: 'erp.manage_inventory', label: 'Manage Inventory', description: 'Create/edit inventory' },
    { key: 'erp.view_orders',      label: 'View Orders',      description: 'View purchase & sales orders' },
    { key: 'erp.manage_orders',    label: 'Manage Orders',    description: 'Create/approve orders' },
    { key: 'erp.view_finance',     label: 'View Finance',     description: 'Access financial data' },
    { key: 'erp.manage_finance',   label: 'Manage Finance',   description: 'Create invoices & accounts' },
    { key: 'erp.view_employees',   label: 'View Employees',   description: 'View employee records' },
    { key: 'erp.manage_employees', label: 'Manage Employees', description: 'Manage HR records' },
    { key: 'erp.view_products',    label: 'View Products',    description: 'Browse product catalogue' },
    { key: 'erp.manage_products',  label: 'Manage Products',  description: 'Create/edit products' },
  ]},
  { group: 'Vendor', items: [
    { key: 'vendor.view_own_products',   label: 'View Own Products',   description: 'See own product listings' },
    { key: 'vendor.manage_own_products', label: 'Manage Own Products', description: 'Add/edit own products' },
    { key: 'vendor.view_own_orders',     label: 'View Own Orders',     description: 'See orders assigned to vendor' },
    { key: 'vendor.process_orders',      label: 'Process Orders',      description: 'Update order status & packing' },
    { key: 'vendor.view_inventory',      label: 'View Inventory',      description: 'See vendor inventory' },
    { key: 'vendor.manage_inventory',    label: 'Manage Inventory',    description: 'Update stock levels' },
    { key: 'vendor.view_invoices',       label: 'View Invoices',       description: 'Access vendor invoices' },
    { key: 'vendor.shipping',            label: 'Shipping Access',     description: 'Create shipments & tracking' },
    { key: 'vendor.view_dashboard',      label: 'Vendor Dashboard',    description: 'Access vendor portal dashboard' },
  ]},
  { group: 'CRM', items: [
    { key: 'crm.view_leads',     label: 'View Leads',     description: 'Browse CRM leads' },
    { key: 'crm.manage_leads',   label: 'Manage Leads',   description: 'Create/edit leads' },
    { key: 'crm.view_customers', label: 'View Customers', description: 'Browse customers' },
  ]},
  { group: 'Documents', items: [
    { key: 'docs.view_agreements',   label: 'View Agreements',   description: 'Read agreements' },
    { key: 'docs.create_agreements', label: 'Create Agreements', description: 'Draft new agreements' },
    { key: 'docs.sign_agreements',   label: 'Sign Agreements',   description: 'Sign as company signatory' },
  ]},
  { group: 'Chat', items: [
    { key: 'chat.access',          label: 'Access Chat',     description: 'Use internal chat' },
    { key: 'chat.manage_channels', label: 'Manage Channels', description: 'Create/manage channels' },
  ]},
  { group: 'Admin', items: [
    { key: 'admin.view_users',   label: 'View Users',   description: 'Browse user accounts' },
    { key: 'admin.manage_users', label: 'Manage Users', description: 'Create/edit/deactivate users' },
    { key: 'admin.manage_roles', label: 'Manage Roles', description: 'Create and assign roles' },
    { key: 'admin.view_audit',   label: 'View Audit Log', description: 'Access audit trail' },
  ]},
]

const ALL_PERMS = ALL_PERMISSIONS.flatMap((g) => g.items.map((i) => i.key))

const SEED_ROLES: Role[] = [
  { id:'1',  name:'Super Admin',       color:'#ffffff', isSystem:true,  userCount:1, permissions:ALL_PERMS, description:'Full platform access',                   createdAt:'2024-01-01' },
  { id:'2',  name:'Admin',             color:'#60a5fa', isSystem:true,  userCount:0, description:'Organisation administrator',
    permissions:['platform.view_dashboard','platform.manage_settings','erp.view_inventory','erp.manage_inventory','erp.view_orders','erp.manage_orders','erp.view_finance','erp.manage_finance','erp.view_employees','erp.manage_employees','erp.view_products','erp.manage_products','crm.view_leads','crm.manage_leads','crm.view_customers','docs.view_agreements','docs.create_agreements','docs.sign_agreements','chat.access','chat.manage_channels','admin.view_users','admin.manage_users'],
    createdAt:'2024-01-01' },
  { id:'3',  name:'Manager',           color:'#a78bfa', isSystem:false, userCount:0, description:'Team manager with ERP & CRM access',
    permissions:['platform.view_dashboard','erp.view_inventory','erp.manage_inventory','erp.view_orders','erp.manage_orders','erp.view_finance','erp.view_employees','erp.view_products','crm.view_leads','crm.manage_leads','crm.view_customers','docs.view_agreements','docs.create_agreements','chat.access'], createdAt:'2024-02-15' },
  { id:'4',  name:'Staff',             color:'#34d399', isSystem:true,  userCount:0, description:'Standard employee access',
    permissions:['platform.view_dashboard','erp.view_inventory','erp.view_orders','erp.view_products','crm.view_leads','docs.view_agreements','chat.access'], createdAt:'2024-01-01' },
  { id:'5',  name:'Vendor',            color:'#f59e0b', isSystem:false, userCount:0, description:'Vendor company account',
    permissions:['vendor.view_own_products','vendor.manage_own_products','vendor.view_own_orders','vendor.process_orders','vendor.view_inventory','vendor.manage_inventory','vendor.view_invoices','vendor.shipping','vendor.view_dashboard','chat.access'], createdAt:'2024-01-01' },
  { id:'6',  name:'Vendor Warehouse',  color:'#fb923c', isSystem:false, userCount:0, description:'Warehouse staff under a vendor',
    permissions:['vendor.view_inventory','vendor.manage_inventory','vendor.view_own_orders','vendor.process_orders','vendor.view_dashboard'], createdAt:'2024-01-01' },
  { id:'7',  name:'Vendor Helper',     color:'#94a3b8', isSystem:false, userCount:0, description:'General helper under a vendor',
    permissions:['vendor.view_own_orders','vendor.view_inventory','vendor.view_dashboard'], createdAt:'2024-01-01' },
  { id:'8',  name:'Vendor Packer',     color:'#67e8f9', isSystem:false, userCount:0, description:'Packing team under a vendor',
    permissions:['vendor.view_own_orders','vendor.process_orders','vendor.view_inventory','vendor.view_dashboard'], createdAt:'2024-01-01' },
  { id:'9',  name:'Vendor Delivery',   color:'#86efac', isSystem:false, userCount:0, description:'Delivery staff under a vendor',
    permissions:['vendor.view_own_orders','vendor.shipping','vendor.view_dashboard'], createdAt:'2024-01-01' },
  { id:'10', name:'Vendor Logistics',  color:'#c4b5fd', isSystem:false, userCount:0, description:'Logistics co-ordinator for a vendor',
    permissions:['vendor.view_own_orders','vendor.process_orders','vendor.shipping','vendor.view_inventory','vendor.view_invoices','vendor.view_dashboard','chat.access'], createdAt:'2024-01-01' },
  { id:'11', name:'Viewer',            color:'#f97316', isSystem:false, userCount:0, description:'Read-only access',
    permissions:['platform.view_dashboard','erp.view_inventory','erp.view_orders'], createdAt:'2024-03-20' },
]

export default function RolesPage() {
  const [roles, setRoles]         = useState<Role[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Role | null>(null)
  const [editing, setEditing]     = useState<Role | null>(null)
  const [showCreate, setCreate]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [expanded, setExpanded]   = useState<Set<string>>(new Set(ALL_PERMISSIONS.map((g) => g.group)))
  const [newRole, setNewRole]     = useState({ name:'', description:'', color:'#60a5fa', permissions:[] as string[] })

  useEffect(() => { loadRoles() }, [])

  async function loadRoles() {
    try {
      const res  = await fetch('/api/admin/roles')
      const data = await res.json()
      if (data.success && data.roles?.length > 0) {
        setRoles(data.roles); setSelected(data.roles[0])
      } else {
        setRoles(SEED_ROLES); setSelected(SEED_ROLES[0])
      }
    } catch { setRoles(SEED_ROLES); setSelected(SEED_ROLES[0]) }
    finally { setLoading(false) }
  }

  function toggleGroup(g: string) {
    setExpanded((p) => { const s = new Set(p); s.has(g) ? s.delete(g) : s.add(g); return s })
  }

  function togglePerm(key: string, isEdit: boolean) {
    if (isEdit && editing) {
      const perms = editing.permissions.includes(key) ? editing.permissions.filter((p) => p !== key) : [...editing.permissions, key]
      setEditing({ ...editing, permissions: perms })
    } else if (showCreate) {
      const perms = newRole.permissions.includes(key) ? newRole.permissions.filter((p) => p !== key) : [...newRole.permissions, key]
      setNewRole({ ...newRole, permissions: perms })
    }
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    try { await fetch(`/api/admin/roles/${editing.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(editing) }) } catch { /* silent */ }
    setRoles((p) => p.map((r) => r.id === editing.id ? editing : r))
    setSelected(editing); setEditing(null); setSaving(false)
  }

  async function createRole() {
    if (!newRole.name.trim()) return
    setSaving(true)
    const role: Role = { id: Date.now().toString(), name: newRole.name, description: newRole.description, color: newRole.color, isSystem: false, userCount: 0, permissions: newRole.permissions, createdAt: new Date().toISOString().split('T')[0] }
    try {
      const res  = await fetch('/api/admin/roles', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(role) })
      const data = await res.json()
      if (data.role?._id) role.id = data.role._id
    } catch { /* silent */ }
    setRoles((p) => [...p, role]); setSelected(role)
    setNewRole({ name:'', description:'', color:'#60a5fa', permissions:[] }); setCreate(false); setSaving(false)
  }

  async function deleteRole(id: string) {
    try { await fetch(`/api/admin/roles/${id}`, { method:'DELETE' }) } catch { /* silent */ }
    setRoles((p) => p.filter((r) => r.id !== id))
    setSelected(roles.find((r) => r.id !== id) || null)
  }

  const displayRole = editing || selected
  const activePerms = showCreate ? newRole.permissions : (displayRole?.permissions || [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-zinc-600" /></div>

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3"><Shield size={22} /> Roles & Permissions</h1>
          <p className="mt-1 text-sm text-zinc-500">{roles.length} roles — manage access across the platform</p>
        </div>
        <button onClick={() => { setCreate(true); setEditing(null); setSelected(null) }}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-zinc-100 transition">
          <Plus size={14} /> New Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role list */}
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3">{roles.length} Roles</p>
          {roles.map((role) => (
            <button key={role.id} onClick={() => { setSelected(role); setEditing(null); setCreate(false) }}
              className={`w-full text-left rounded-xl border p-3 transition ${selected?.id === role.id && !showCreate ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white truncate">{role.name}</span>
                    {role.isSystem && <Lock size={10} className="text-zinc-600" />}
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{role.description}</p>
                </div>
                <div className="flex items-center gap-1 text-zinc-600 flex-shrink-0">
                  <Users size={10} /><span className="text-[11px]">{role.userCount}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Permissions panel */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            {showCreate ? (
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <input type="color" value={newRole.color} onChange={(e) => setNewRole({ ...newRole, color: e.target.value })} className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                  <input type="text" placeholder="Role name" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25" />
                  <div className="flex gap-2">
                    <button onClick={createRole} disabled={saving} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button onClick={() => setCreate(false)} className="p-2 text-zinc-500 hover:bg-white/[0.06] rounded-lg transition"><X size={14} /></button>
                  </div>
                </div>
                <input type="text" placeholder="Description" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25" />
              </div>
            ) : displayRole ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: displayRole.color }} />
                  <div>
                    <h2 className="text-base font-semibold text-white">{displayRole.name}</h2>
                    <p className="text-xs text-zinc-500">{displayRole.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600">{activePerms.length} perms</span>
                  {!displayRole.isSystem && !editing && (
                    <>
                      <button onClick={() => setEditing(displayRole)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition"><Edit2 size={13} /></button>
                      <button onClick={() => deleteRole(displayRole.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={13} /></button>
                    </>
                  )}
                  {editing && (
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 bg-white text-black text-xs rounded-lg hover:bg-zinc-100 transition flex items-center gap-1.5">
                        {saving && <Loader2 size={11} className="animate-spin" />} Save
                      </button>
                      <button onClick={() => setEditing(null)} className="px-3 py-1.5 border border-white/10 text-xs text-zinc-400 rounded-lg hover:bg-white/[0.06] transition">Cancel</button>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="p-5 space-y-4 overflow-y-auto max-h-[600px]">
            {ALL_PERMISSIONS.map((group) => (
              <div key={group.group}>
                <button onClick={() => toggleGroup(group.group)} className="flex items-center gap-2 w-full text-left mb-2">
                  {expanded.has(group.group) ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{group.group}</span>
                  <span className="text-[10px] text-zinc-600">({group.items.filter((i) => activePerms.includes(i.key)).length}/{group.items.length})</span>
                </button>
                {expanded.has(group.group) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                    {group.items.map((perm) => {
                      const enabled  = activePerms.includes(perm.key)
                      const editable = showCreate || (editing && !editing.isSystem)
                      return (
                        <button key={perm.key} onClick={() => editable && togglePerm(perm.key, !!editing)} disabled={!editable}
                          className={`text-left rounded-lg border p-2.5 transition ${enabled ? 'border-white/20 bg-white/[0.05]' : 'border-white/[0.04] opacity-50'} ${editable ? 'cursor-pointer hover:border-white/30' : 'cursor-default'}`}>
                          <div className="flex items-center gap-2">
                            {enabled ? <Eye size={11} className="text-emerald-400" /> : <EyeOff size={11} className="text-zinc-600" />}
                            <span className={`text-xs font-medium ${enabled ? 'text-white' : 'text-zinc-500'}`}>{perm.label}</span>
                          </div>
                          <p className="text-[10px] text-zinc-600 mt-0.5 pl-4">{perm.description}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {displayRole?.isSystem && !showCreate && (
            <div className="px-5 pb-4">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 flex items-center gap-2">
                <Lock size={12} className="text-zinc-600" />
                <p className="text-xs text-zinc-600">System roles cannot be modified</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
