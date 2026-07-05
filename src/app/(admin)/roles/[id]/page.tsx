"use client";

import { use, useEffect, useState } from "react";

interface Permission {
  id: string;
  name: string;
  code: string;
}

interface PermissionGroup {
  module: string;
  group: string;
  permissions: Permission[];
}

export default function RolePermissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roleId } = use(params);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const [permsRes, rolePermsRes] = await Promise.all([
        fetch("/api/permissions"),
        fetch(`/api/roles/${roleId}/permissions`),
      ]);
      const permsData = await permsRes.json();
      const rolePermsData = await rolePermsRes.json();
      if (permsData.success) setGroups(permsData.data);
      if (rolePermsData.success) setSelected(new Set(rolePermsData.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPermissions(); }, [roleId]);

  const togglePermission = (id: string) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelected(newSet);
  };

  const toggleGroup = (perms: Permission[]) => {
    const newSet = new Set(selected);
    const allSelected = perms.every(p => newSet.has(p.id));
    perms.forEach(p => allSelected ? newSet.delete(p.id) : newSet.add(p.id));
    setSelected(newSet);
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save");
      alert("Permissions updated successfully");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading permissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <button onClick={() => history.back()} className="text-gray-500 text-sm mb-2 hover:text-gray-900 transition">← Back to Roles</button>
            <h1 className="text-2xl font-semibold">Role Permissions</h1>
            <p className="text-gray-500 text-sm mt-1">Configure what this role can access</p>
          </div>
          <button
            onClick={savePermissions}
            disabled={saving}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="space-y-4">
          {groups.map((group, index) => {
            const allSelected = group.permissions.every(p => selected.has(p.id));
            const someSelected = group.permissions.some(p => selected.has(p.id));
            return (
              <div key={index} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{group.module}</span>
                    <h3 className="font-medium mt-0.5">{group.group}</h3>
                  </div>
                  <button
                    onClick={() => toggleGroup(group.permissions)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                      allSelected ? "bg-gray-900 text-white border-white" : someSelected ? "border-gray-300 text-gray-600" : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.permissions.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-400 cursor-pointer transition">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${selected.has(perm.id) ? "bg-white border-white" : "border-gray-300"}`}>
                        {selected.has(perm.id) && <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5 1 6.5l4 4 6-7z"/></svg>}
                      </div>
                      <input type="checkbox" className="hidden" checked={selected.has(perm.id)} onChange={() => togglePermission(perm.id)} />
                      <div>
                        <div className="text-sm font-medium">{perm.name}</div>
                        <div className="text-xs text-gray-600">{perm.code}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
