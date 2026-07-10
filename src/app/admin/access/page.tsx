"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { ACCESS_HIERARCHY } from "@/core/access/moduleHierarchy";
import { STANDARD_ACTIONS } from "@/core/access/actions";

interface Role {
  _id: string;
  name: string;
  code: string;
  description?: string;
  color?: string;
  isSystem?: boolean;
  isProtected?: boolean;
  permissions: string[];
}

function buildCode(moduleKey: string, actionKey: string): string {
  return `${moduleKey.toUpperCase()}.${actionKey.toUpperCase()}`;
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
  const [search, setSearch] = useState("");
  // Every category (and, within it, every subcategory) starts expanded so
  // the whole tree — main category > sub category > module > privilege —
  // is visible at a glance, matching what was asked for: every access
  // entry visible, not buried behind extra clicks.
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    const open: Record<string, boolean> = {};
    ACCESS_HIERARCHY.forEach((c) => { open[c.key] = true; });
    return open;
  });
  const [openSubcategories, setOpenSubcategories] = useState<Record<string, boolean>>(() => {
    const open: Record<string, boolean> = {};
    ACCESS_HIERARCHY.forEach((c) => (c.subcategories ?? []).forEach((sc) => { open[sc.key] = true; }));
    return open;
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      const list = data.roles || data || [];
      setRoles(list);
      setSelectedRole((prev) => {
        if (!prev) return prev;
        const fresh = list.find((r: Role) => r._id === prev._id);
        return fresh || prev;
      });
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  function togglePermission(code: string) {
    if (!selectedRole) return;
    const has = selectedRole.permissions.includes(code);
    const updated = has
      ? selectedRole.permissions.filter((p) => p !== code)
      : [...selectedRole.permissions, code];
    setSelectedRole({ ...selectedRole, permissions: updated });
  }

  /** Grant/revoke every action for a module in one click. */
  function toggleModule(moduleKey: string, grant: boolean) {
    if (!selectedRole) return;
    const moduleCodes = STANDARD_ACTIONS.map((a) => buildCode(moduleKey, a.key));
    const withoutModule = selectedRole.permissions.filter((p) => !moduleCodes.includes(p));
    setSelectedRole({
      ...selectedRole,
      permissions: grant ? [...withoutModule, ...moduleCodes] : withoutModule,
    });
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

  // Filter the hierarchy by module label / key when searching, so a large
  // 30-module tree stays navigable instead of requiring endless scrolling.
  const filteredHierarchy = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ACCESS_HIERARCHY;

    return ACCESS_HIERARCHY.map((cat) => {
      const matchesCat = (m: { key: string; label: string }) =>
        m.label.toLowerCase().includes(q) || m.key.includes(q);

      if (cat.modules) {
        const modules = cat.modules.filter(matchesCat);
        return modules.length ? { ...cat, modules } : null;
      }
      const subcategories = (cat.subcategories ?? [])
        .map((sc) => {
          const modules = sc.modules.filter(matchesCat);
          return modules.length ? { ...sc, modules } : null;
        })
        .filter((sc): sc is NonNullable<typeof sc> => sc !== null);
      return subcategories.length ? { ...cat, subcategories } : null;
    }).filter((c): c is NonNullable<typeof c> => c !== null);
  }, [search]);

  const rowCls =
    "flex items-center justify-between gap-4 px-4 py-2.5 border-b border-gray-100 last:border-0";

  function renderModuleRow(moduleKey: string, label: string) {
    if (!selectedRole) return null;
    const moduleCodes = STANDARD_ACTIONS.map((a) => buildCode(moduleKey, a.key));
    const grantedCount = moduleCodes.filter((c) => selectedRole.permissions.includes(c)).length;
    const allGranted = grantedCount === moduleCodes.length;

    return (
      <div key={moduleKey} className={rowCls}>
        <div className="flex items-center gap-2 min-w-[220px] shrink-0">
          <button
            onClick={() => toggleModule(moduleKey, !allGranted)}
            title={allGranted ? "Revoke all privileges for this module" : "Grant all privileges for this module"}
            className={`text-[10px] font-semibold px-2 py-1 rounded ${
              allGranted
                ? "bg-emerald-100 text-emerald-700"
                : grantedCount > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {grantedCount}/{moduleCodes.length}
          </button>
          <span className="text-sm font-medium text-gray-900">{label}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {STANDARD_ACTIONS.map((action) => {
            const code = buildCode(moduleKey, action.key);
            const active = selectedRole.permissions.includes(code);
            return (
              <button
                key={action.key}
                onClick={() => togglePermission(code)}
                title={action.description}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  active
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                }`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    );
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
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selectedRole.color || "#6366f1" }}
                />
                <div className="min-w-0">
                  <h1 className="text-base font-semibold text-gray-900 truncate">{selectedRole.name}</h1>
                  {selectedRole.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{selectedRole.description}</p>
                  )}
                </div>
                {selectedRole.isSystem && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded shrink-0">
                    System
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search modules…"
                  className="w-48 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition"
                />
                <button
                  onClick={savePermissions}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-60 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Hierarchical Permission Tree: Category > Subcategory > Module > Privilege */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredHierarchy.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">No modules match &quot;{search}&quot;</p>
              ) : (
                filteredHierarchy.map((cat) => {
                  const catOpen = openCategories[cat.key] !== false;
                  return (
                    <div key={cat.key} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                      <button
                        onClick={() => setOpenCategories((p) => ({ ...p, [cat.key]: !catOpen }))}
                        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                          {cat.label}
                        </span>
                        {catOpen ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {catOpen && (
                        <div>
                          {cat.modules &&
                            cat.modules.map((m) => renderModuleRow(m.key, m.label))}

                          {cat.subcategories &&
                            cat.subcategories.map((sc) => {
                              const scOpen = openSubcategories[sc.key] !== false;
                              return (
                                <div key={sc.key} className="border-t border-gray-100 first:border-0">
                                  <button
                                    onClick={() =>
                                      setOpenSubcategories((p) => ({ ...p, [sc.key]: !scOpen }))
                                    }
                                    className="w-full flex items-center justify-between px-5 py-2 bg-gray-25 hover:bg-gray-50 transition-colors"
                                  >
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                      {sc.label}
                                    </span>
                                    {scOpen ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                    )}
                                  </button>
                                  {scOpen && (
                                    <div>{sc.modules.map((m) => renderModuleRow(m.key, m.label))}</div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
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
