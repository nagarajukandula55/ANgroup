'use client';

import { useState, useEffect, useCallback } from 'react';

interface Permission {
  code: string;
  name: string;
}

interface Role {
  _id: string;
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
  userCount?: number;
}

type PermissionMatrix = Record<string, Permission[]>;

const PERMISSION_MATRIX: PermissionMatrix = {
  Inventory: [
    { code: 'inventory.view', name: 'View Inventory' },
    { code: 'inventory.create', name: 'Create Items' },
    { code: 'inventory.edit', name: 'Edit Items' },
    { code: 'inventory.delete', name: 'Delete Items' },
    { code: 'inventory.adjust', name: 'Adjust Stock' },
  ],
  Sales: [
    { code: 'sales.view', name: 'View Sales' },
    { code: 'sales.create', name: 'Create Orders' },
    { code: 'sales.edit', name: 'Edit Orders' },
    { code: 'sales.delete', name: 'Delete Orders' },
    { code: 'sales.approve', name: 'Approve Orders' },
  ],
  Purchase: [
    { code: 'purchase.view', name: 'View Purchases' },
    { code: 'purchase.create', name: 'Create POs' },
    { code: 'purchase.edit', name: 'Edit POs' },
    { code: 'purchase.approve', name: 'Approve POs' },
  ],
  Finance: [
    { code: 'finance.view', name: 'View Finance' },
    { code: 'finance.create', name: 'Create Transactions' },
    { code: 'finance.approve', name: 'Approve Payments' },
    { code: 'finance.reports', name: 'Financial Reports' },
  ],
  HR: [
    { code: 'hr.view', name: 'View HR' },
    { code: 'hr.manage', name: 'Manage Employees' },
    { code: 'hr.payroll', name: 'Manage Payroll' },
    { code: 'hr.leaves', name: 'Manage Leaves' },
  ],
  CRM: [
    { code: 'crm.view', name: 'View CRM' },
    { code: 'crm.create', name: 'Create Contacts' },
    { code: 'crm.edit', name: 'Edit Contacts' },
    { code: 'crm.delete', name: 'Delete Contacts' },
  ],
  Admin: [
    { code: 'admin.users', name: 'Manage Users' },
    { code: 'admin.roles', name: 'Manage Roles' },
    { code: 'admin.settings', name: 'System Settings' },
    { code: 'admin.businesses', name: 'Manage Businesses' },
  ],
};

const ROLE_DOT_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500',
  ADMIN: 'bg-red-500',
  MANAGER: 'bg-orange-500',
  EMPLOYEE: 'bg-blue-500',
  VENDOR: 'bg-green-500',
  CUSTOMER: 'bg-zinc-400',
};

function getRoleDotColor(code: string) {
  return ROLE_DOT_COLORS[code] || 'bg-indigo-500';
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-blue-500' : 'bg-zinc-700'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition duration-200 ease-in-out ${enabled ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

export default function AccessPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Set<string>>>({});
  const [originalPermissions, setOriginalPermissions] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', description: '' });
  const [creating, setCreating] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      const data = await res.json();
      const fetchedRoles: Role[] = data.roles || [];
      setRoles(fetchedRoles);

      const permMap: Record<string, Set<string>> = {};
      fetchedRoles.forEach((role) => {
        permMap[role._id] = new Set(role.permissions || []);
      });
      setPermissions(permMap);
      setOriginalPermissions(
        Object.fromEntries(Object.entries(permMap).map(([k, v]) => [k, new Set(v)]))
      );

      if (fetchedRoles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(fetchedRoles[0]._id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    fetchRoles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePermission(permCode: string) {
    if (!selectedRoleId) return;
    setPermissions((prev) => {
      const updated = new Set(prev[selectedRoleId] || []);
      if (updated.has(permCode)) {
        updated.delete(permCode);
      } else {
        updated.add(permCode);
      }
      return { ...prev, [selectedRoleId]: updated };
    });
  }

  function hasChanges() {
    if (!selectedRoleId) return false;
    const current = permissions[selectedRoleId];
    const original = originalPermissions[selectedRoleId];
    if (!current || !original) return false;
    if (current.size !== original.size) return true;
    for (const p of current) {
      if (!original.has(p)) return true;
    }
    return false;
  }

  async function savePermissions() {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      const permsArray = Array.from(permissions[selectedRoleId] || []);
      await fetch(`/api/admin/roles/${selectedRoleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permsArray }),
      });
      setOriginalPermissions((prev) => ({
        ...prev,
        [selectedRoleId]: new Set(permsArray),
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function createRole() {
    if (!createForm.name || !createForm.code) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          code: createForm.code.toUpperCase(),
          description: createForm.description,
          permissions: [],
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setCreateForm({ name: '', code: '', description: '' });
        await fetchRoles();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  const selectedRole = roles.find((r) => r._id === selectedRoleId);
  const selectedPerms = selectedRoleId ? (permissions[selectedRoleId] || new Set<string>()) : new Set<string>();
  const enabledCount = selectedPerms.size;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Access Management</h1>
        <p className="text-zinc-400 text-sm mt-1">Define what each role can do across all modules</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Roles panel */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Roles</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/60 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Create Role
              </button>
            </div>
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role._id}
                  onClick={() => setSelectedRoleId(role._id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedRoleId === role._id
                      ? 'bg-blue-500/20 border-blue-500/30'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getRoleDotColor(role.code)}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{role.name || role.code}</p>
                        <p className="text-xs text-zinc-500 font-mono">{role.code}</p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500 bg-white/[0.05] rounded px-1.5 py-0.5 flex-shrink-0 ml-2">
                      {role.userCount ?? 0}
                    </span>
                  </div>
                </button>
              ))}
              {roles.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-4">No roles yet</p>
              )}
            </div>
          </div>

          {/* Right: Permissions panel */}
          <div className="md:col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-xl">
            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center h-64">
                <svg className="w-10 h-10 text-zinc-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-zinc-400 text-sm">Select a role to configure permissions</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getRoleDotColor(selectedRole.code)}`} />
                    <h2 className="text-base font-semibold text-white">{selectedRole.name || selectedRole.code} Permissions</h2>
                    <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                      {enabledCount} enabled
                    </span>
                  </div>
                  <button
                    onClick={savePermissions}
                    disabled={!hasChanges() || saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
                <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {Object.entries(PERMISSION_MATRIX).map(([module, perms]) => (
                    <div key={module}>
                      <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-3">{module}</p>
                      <div className="space-y-2">
                        {perms.map((perm) => {
                          const isEnabled = selectedPerms.has(perm.code);
                          return (
                            <div
                              key={perm.code}
                              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                            >
                              <div>
                                <p className="text-sm text-white">{perm.name}</p>
                                <p className="text-xs text-zinc-600 font-mono">{perm.code}</p>
                              </div>
                              <Toggle enabled={isEnabled} onToggle={() => togglePermission(perm.code)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-zinc-900 border border-white/[0.08] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Create New Role</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Role Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const code = name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
                    setCreateForm({ ...createForm, name, code });
                  }}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600"
                  placeholder="e.g. Store Manager"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Role Code *</label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500/50 placeholder-zinc-600"
                  placeholder="STORE_MANAGER"
                />
                <p className="text-xs text-zinc-600 mt-1">Auto-generated from name. Used for programmatic access.</p>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600 resize-none"
                  placeholder="Describe what this role can do..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 border border-white/[0.08] text-zinc-300 hover:text-white text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRole}
                disabled={!createForm.name || !createForm.code || creating}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium transition-colors"
              >
                {creating ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
