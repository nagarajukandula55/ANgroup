"use client";

import { useEffect, useState } from "react";

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
  params: { id: string };
}) {
  const roleId = params.id;

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* =========================================================
   * FETCH PERMISSIONS
   * =======================================================*/
  const fetchPermissions = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/permissions");
      const data = await res.json();

      if (!data.success) {
        throw new Error("Failed to load permissions");
      }

      setGroups(data.data);

      /**
       * NOTE:
       * Later we will fetch role-specific permissions
       * and pre-check selected ones
       */
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  /* =========================================================
   * TOGGLE PERMISSION
   * =======================================================*/
  const togglePermission = (id: string) => {
    const newSet = new Set(selected);

    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }

    setSelected(newSet);
  };

  /* =========================================================
   * SAVE ROLE PERMISSIONS
   * =======================================================*/
  const savePermissions = async () => {
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissionIds: Array.from(selected),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to save");
      }

      alert("Permissions updated successfully");
    } catch (err: any) {
      alert(err.message);
    }
  };

  /* =========================================================
   * UI
   * =======================================================*/
  if (loading) {
    return <div className="p-6">Loading permissions...</div>;
  }

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">
          Role Permissions
        </h1>

        <button
          onClick={savePermissions}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Save Changes
        </button>
      </div>

      {/* PERMISSION GROUPS */}
      <div className="space-y-6">
        {groups.map((group, index) => (
          <div
            key={index}
            className="border rounded p-4"
          >
            <div className="font-semibold mb-3">
              {group.module} / {group.group}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {group.permissions.map((perm) => (
                <label
                  key={perm.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                  />
                  <span>{perm.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
