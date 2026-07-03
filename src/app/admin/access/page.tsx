"use client";

import React, { useState, useEffect } from "react";

const PERMISSION_MATRIX: { module: string; permissions: string[] }[] = [
  { module: "Inventory", permissions: ["view", "create", "edit", "delete", "adjust"] },
  { module: "Sales", permissions: ["view", "create", "edit", "delete", "approve"] },
  { module: "Purchase", permissions: ["view", "create", "edit", "approve"] },
  { module: "Finance", permissions: ["view", "create", "approve", "reports"] },
  { module: "HR", permissions: ["view", "manage", "payroll", "leaves"] },
  { module: "CRM", permissions: ["view", "create", "edit", "delete"] },
  { module: "Agreements", permissions: ["view", "create", "edit", "delete", "send"] },
  { module: "Vendors", permissions: ["view", "create", "edit", "approve"] },
  { module: "Products", permissions: ["view", "create", "edit", "delete"] },
  { module: "Admin", permissions: ["users", "roles", "settings", "businesses"] },
];

interface Role {
  _id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  isSystem?: boolean;
  permissions: string[];
}

export default function AccessPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [newRoleName, setNewRoleName] = useState<string>("");
  const [newRoleCode, setNewRoleCode] = useState<string>("");
  const [newRoleColor, setNewRoleColor] = useState<string>("#6366f1");
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; role: Role | null }>({
    open: false,
    role: null,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      setRoles(data.roles || data || []);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  function togglePermission(permission: string) {
    if (!selectedRole) return;
    const has = selectedRole.permissions.includes(permission);
    const updated = has
      ? selectedRole.permissions.filter((p) => p !== permission)
      : [...selectedRole.permissions, permission];
    setSelectedRole({ ...selectedRole, permissions: updated });
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/roles/${selectedRole._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedRole.permissions }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = roles.map((r) =>
        r._id === selectedRole._id ? { ...r, permissions: selectedRole.permissions } : r
      );
      setRoles(updated);
    } catch {
      // error is swallowed; could add toast here
    } finally {
      setSaving(false);
    }
  }

  async function createRole() {
    if (!newRoleName.trim() || !newRoleCode.trim()) return;
    try {
      await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName,
          code: newRoleCode,
          color: newRoleColor,
          permissions: [],
        }),
      });
      await fetchRoles();
      setCreating(false);
      setNewRoleName("");
      setNewRoleCode("");
      setNewRoleColor("#6366f1");
    } catch {
      // error is swallowed; could add toast here
    }
  }

  async function deleteRole(role: Role) {
    try {
      await fetch(`/api/admin/roles/${role._id}`, { method: "DELETE" });
      const updated = roles.filter((r) => r._id !== role._id);
      setRoles(updated);
      if (selectedRole?._id === role._id) {
        setSelectedRole(null);
      }
      setDeleteModal({ open: false, role: null });
    } catch {
      // error is swallowed; could add toast here
    }
  }

  function handleNameChange(val: string) {
    setNewRoleName(val);
    setNewRoleCode(val.toUpperCase().replace(/\s+/g, "_"));
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Panel */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Roles</h2>
          <button
            onClick={() => setCreating(true)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Create Role
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Loading...
            </div>
          ) : roles.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              No roles found
            </div>
          ) : (
            <ul className="py-1">
              {roles.map((role) => {
                const isSelected = selectedRole?._id === role._id;
                return (
                  <li key={role._id}>
                    <button
                      onClick={() => setSelectedRole(role)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors group ${
                        isSelected
                          ? "bg-gray-50 border-l-2 border-gray-900"
                          : "border-l-2 border-transparent hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: role.color || "#6366f1" }}
                        />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {role.name}
                        </span>
                        {role.isSystem && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                            System
                          </span>
                        )}
                      </div>
                      {!role.isSystem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ open: true, role });
                          }}
                          className="flex-shrink-0 ml-2 p-1 text-gray-400 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                          aria-label={`Delete ${role.name}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Right Panel */}
      <main className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
        {!selectedRole ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">Select a role to manage permissions</p>
          </div>
        ) : (
          <>
            {/* Role Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedRole.color || "#6366f1" }}
                />
                <div>
                  <h1 className="text-base font-semibold text-gray-900">{selectedRole.name}</h1>
                  {selectedRole.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedRole.description}</p>
                  )}
                </div>
                {selectedRole.isSystem && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded">
                    System
                  </span>
                )}
              </div>
              <button
                onClick={savePermissions}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-60 transition-colors"
              >
                {saving && (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Permission Matrix */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                        Module
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Permissions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {PERMISSION_MATRIX.map(({ module, permissions }) => (
                      <tr key={module} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {module}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {permissions.map((perm) => {
                              const key = `${module.toLowerCase()}:${perm}`;
                              const active = selectedRole.permissions.includes(key);
                              return (
                                <button
                                  key={perm}
                                  onClick={() => togglePermission(key)}
                                  className={`px-3 py-1 text-xs font-medium rounded transition-colors capitalize ${
                                    active
                                      ? "bg-gray-900 text-white"
                                      : "border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                                  }`}
                                >
                                  {perm}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Create Role Modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-5">Create Role</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Store Manager"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Role Code
                </label>
                <input
                  type="text"
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="e.g. STORE_MANAGER"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent placeholder-gray-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    className="w-10 h-9 rounded border border-gray-200 cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-gray-500 font-mono">{newRoleColor}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setCreating(false);
                  setNewRoleName("");
                  setNewRoleCode("");
                  setNewRoleColor("#6366f1");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRole}
                disabled={!newRoleName.trim() || !newRoleCode.trim()}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && deleteModal.role && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete Role</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Are you sure you want to delete role{" "}
                  <span className="font-medium text-gray-900">{deleteModal.role.name}</span>?
                  This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setDeleteModal({ open: false, role: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteModal.role && deleteRole(deleteModal.role)}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
