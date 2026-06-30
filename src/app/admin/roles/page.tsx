'use client'

import { useState } from 'react'
import Layout from '@/components/layout'
import {
  Shield, Plus, Edit2, Trash2, Check, X,
  Users, Lock, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react'

interface Permission {
  key: string
  label: string
  description: string
}

interface Role {
  id: string
  name: string
  description: string
  color: string
  isSystem: boolean
  userCount: number
  permissions: string[]
  createdAt: string
}

const ALL_PERMISSIONS: { group: string; items: Permission[] }[] = [
  {
    group: 'Platform',
    items: [
      { key: 'platform.view_dashboard', label: 'View Dashboard', description: 'Access main dashboard' },
      { key: 'platform.manage_settings', label: 'Manage Settings', description: 'Change platform settings' },
    ],
  },
  {
    group: 'ERP',
    items: [
      { key: 'erp.view_inventory', label: 'View Inventory', description: 'Browse inventory items' },
      { key: 'erp.manage_inventory', label: 'Manage Inventory', description: 'Create/edit inventory' },
      { key: 'erp.view_orders', label: 'View Orders', description: 'View purchase & sales orders' },
      { key: 'erp.manage_orders', label: 'Manage Orders', description: 'Create/approve orders' },
      { key: 'erp.view_finance', label: 'View Finance', description: 'Access financial data' },
      { key: 'erp.manage_finance', label: 'Manage Finance', description: 'Create invoices & manage accounts' },
      { key: 'erp.view_employees', label: 'View Employees', description: 'View employee records' },
      { key: 'erp.manage_employees', label: 'Manage Employees', description: 'Manage HR records' },
    ],
  },
  {
    group: 'CRM',
    items: [
      { key: 'crm.view_leads', label: 'View Leads', description: 'Browse CRM leads' },
      { key: 'crm.manage_leads', label: 'Manage Leads', description: 'Create/edit CRM leads' },
      { key: 'crm.view_customers', label: 'View Customers', description: 'Browse customers' },
    ],
  },
  {
    group: 'Documents',
    items: [
      { key: 'docs.view_agreements', label: 'View Agreements', description: 'Read agreements' },
      { key: 'docs.create_agreements', label: 'Create Agreements', description: 'Draft new agreements' },
      { key: 'docs.sign_agreements', label: 'Sign Agreements', description: 'Sign as company signatory' },
    ],
  },
  {
    group: 'Chat',
    items: [
      { key: 'chat.access', label: 'Access Chat', description: 'Use internal chat' },
      { key: 'chat.manage_channels', label: 'Manage Channels', description: 'Create and manage channels' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { key: 'admin.view_users', label: 'View Users', description: 'Browse user accounts' },
      { key: 'admin.manage_users', label: 'Manage Users', description: 'Create/edit/deactivate users' },
      { key: 'admin.manage_roles', label: 'Manage Roles', description: 'Create and assign roles' },
      { key: 'admin.view_audit_log', label: 'View Audit Log', description: 'Access audit trail' },
    ],
  },
]

const INITIAL_ROLES: Role[] = [
  {
    id: '1',
    name: 'Super Admin',
    description: 'Full platform access — all permissions granted',
    color: '#ffffff',
    isSystem: true,
    userCount: 1,
    permissions: ALL_PERMISSIONS.flatMap(g => g.items.map(i => i.key)),
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Admin',
    description: 'Organisation administrator with broad access',
    color: '#60a5fa',
    isSystem: true,
    userCount: 3,
    permissions: [
      'platform.view_dashboard', 'platform.manage_settings',
      'erp.view_inventory', 'erp.manage_inventory',
      'erp.view_orders', 'erp.manage_orders',
      'erp.view_finance', 'erp.view_employees', 'erp.manage_employees',
      'crm.view_leads', 'crm.manage_leads', 'crm.view_customers',
      'docs.view_agreements', 'docs.create_agreements', 'docs.sign_agreements',
      'chat.access', 'chat.manage_channels',
      'admin.view_users', 'admin.manage_users',
    ],
    createdAt: '2024-01-01',
  },
  {
    id: '3',
    name: 'Manager',
    description: 'Team manager with ERP and CRM access',
    color: '#a78bfa',
    isSystem: false,
    userCount: 8,
    permissions: [
      'platform.view_dashboard',
      'erp.view_inventory', 'erp.manage_inventory',
      'erp.view_orders', 'erp.manage_orders',
      'erp.view_finance',
      'erp.view_employees',
      'crm.view_leads', 'crm.manage_leads', 'crm.view_customers',
      'docs.view_agreements', 'docs.create_agreements',
      'chat.access',
    ],
    createdAt: '2024-02-15',
  },
  {
    id: '4',
    name: 'Staff',
    description: 'Standard employee access',
    color: '#34d399',
    isSystem: true,
    userCount: 24,
    permissions: [
      'platform.view_dashboard',
      'erp.view_inventory',
      'erp.view_orders',
      'crm.view_leads', 'crm.view_customers',
      'docs.view_agreements',
      'chat.access',
    ],
    createdAt: '2024-01-01',
  },
  {
    id: '5',
    name: 'Viewer',
    description: 'Read-only access to non-sensitive areas',
    color: '#fb923c',
    isSystem: false,
    userCount: 5,
    permissions: [
      'platform.view_dashboard',
      'erp.view_inventory',
      'erp.view_orders',
      'chat.access',
    ],
    createdAt: '2024-03-20',
  },
]

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES)
  const [selectedRole, setSelectedRole] = useState<Role | null>(INITIAL_ROLES[0])
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(ALL_PERMISSIONS.map(g => g.group)))
  const [newRole, setNewRole] = useState({ name: '', description: '', color: '#60a5fa', permissions: [] as string[] })

  function toggleGroup(group: string) {
    setExpandedGroups(prev => {
      const s = new Set(prev)
      if (s.has(group)) s.delete(group)
      else s.add(group)
      return s
    })
  }

  function togglePermission(roleId: string, permKey: string, isEdit = false) {
    if (isEdit && editingRole) {
      const perms = editingRole.permissions.includes(permKey)
        ? editingRole.permissions.filter(p => p !== permKey)
        : [...editingRole.permissions, permKey]
      setEditingRole({ ...editingRole, permissions: perms })
    } else if (showCreate) {
      const perms = newRole.permissions.includes(permKey)
        ? newRole.permissions.filter(p => p !== permKey)
        : [...newRole.permissions, permKey]
      setNewRole({ ...newRole, permissions: perms })
    }
  }

  function saveEdit() {
    if (!editingRole) return
    setRoles(prev => prev.map(r => r.id === editingRole.id ? editingRole : r))
    setSelectedRole(editingRole)
    setEditingRole(null)
  }

  function createRole() {
    if (!newRole.name.trim()) return
    const role: Role = {
      id: Date.now().toString(),
      name: newRole.name,
      description: newRole.description,
      color: newRole.color,
      isSystem: false,
      userCount: 0,
      permissions: newRole.permissions,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setRoles(prev => [...prev, role])
    setSelectedRole(role)
    setNewRole({ name: '', description: '', color: '#60a5fa', permissions: [] })
    setShowCreate(false)
  }

  function deleteRole(id: string) {
    setRoles(prev => prev.filter(r => r.id !== id))
    setSelectedRole(roles[0] || null)
  }

  const displayRole = editingRole || selectedRole
  const activePermissions = showCreate ? newRole.permissions : (displayRole?.permissions || [])

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Shield size={24} />
              Roles & Permissions
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Define what each role can access across the platform
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setEditingRole(null); setSelectedRole(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-zinc-100 transition"
          >
            <Plus size={15} />
            New Role
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
              {roles.length} Roles
            </p>
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => { setSelectedRole(role); setEditingRole(null); setShowCreate(false) }}
                className={`w-full text-left rounded-xl border p-4 transition ${
                  selectedRole?.id === role.id && !showCreate
                    ? 'border-white/20 bg-white/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{role.name}</span>
                      {role.isSystem && (
                        <Lock size={11} className="text-zinc-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5 truncate">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-600 flex-shrink-0">
                    <Users size={11} />
                    <span className="text-xs">{role.userCount}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Permissions Panel */}
          <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.02]">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              {showCreate ? (
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newRole.color}
                      onChange={e => setNewRole({ ...newRole, color: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Role name"
                      value={newRole.name}
                      onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                      className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
                    />
                    <div className="flex gap-2">
                      <button onClick={createRole} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setShowCreate(false)} className="p-2 text-zinc-500 hover:bg-white/[0.06] rounded-lg transition">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newRole.description}
                    onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
                  />
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
                    <span className="text-xs text-zinc-600">{activePermissions.length} permissions</span>
                    {!displayRole.isSystem && !editingRole && (
                      <>
                        <button
                          onClick={() => setEditingRole(displayRole)}
                          className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteRole(displayRole.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {editingRole && (
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="px-3 py-1.5 bg-white text-black text-xs rounded-lg hover:bg-zinc-100 transition">
                          Save changes
                        </button>
                        <button onClick={() => setEditingRole(null)} className="px-3 py-1.5 border border-white/10 text-xs text-zinc-400 rounded-lg hover:bg-white/[0.06] transition">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Permissions Grid */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[600px]">
              {ALL_PERMISSIONS.map(group => (
                <div key={group.group}>
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    {expandedGroups.has(group.group) ? <ChevronUp size={13} className="text-zinc-500" /> : <ChevronDown size={13} className="text-zinc-500" />}
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{group.group}</span>
                    <span className="text-xs text-zinc-600">
                      ({group.items.filter(i => activePermissions.includes(i.key)).length}/{group.items.length})
                    </span>
                  </button>

                  {expandedGroups.has(group.group) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-4">
                      {group.items.map(perm => {
                        const enabled = activePermissions.includes(perm.key)
                        const isEditable = showCreate || (editingRole && !editingRole.isSystem)

                        return (
                          <button
                            key={perm.key}
                            onClick={() => isEditable && togglePermission(displayRole?.id || '', perm.key, !!editingRole)}
                            disabled={!isEditable}
                            className={`text-left rounded-lg border p-3 transition ${
                              enabled
                                ? 'border-white/20 bg-white/[0.05]'
                                : 'border-white/[0.04] bg-transparent opacity-50'
                            } ${isEditable ? 'cursor-pointer hover:border-white/30' : 'cursor-default'}`}
                          >
                            <div className="flex items-center gap-2">
                              {enabled
                                ? <Eye size={12} className="text-emerald-400 flex-shrink-0" />
                                : <EyeOff size={12} className="text-zinc-600 flex-shrink-0" />
                              }
                              <span className={`text-xs font-medium ${enabled ? 'text-white' : 'text-zinc-500'}`}>
                                {perm.label}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600 mt-0.5 pl-4">{perm.description}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* System role note */}
            {displayRole?.isSystem && !showCreate && (
              <div className="px-5 pb-4">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 flex items-center gap-2">
                  <Lock size={13} className="text-zinc-600" />
                  <p className="text-xs text-zinc-600">System roles cannot be modified</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
