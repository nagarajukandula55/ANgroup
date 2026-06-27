"use client";

import { useEffect, useState } from "react";

interface Role {
  _id: string;
  name: string;
  code: string;
  description?: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /* =========================================================
   * FETCH ROLES
   * =======================================================*/
  const fetchRoles = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/roles?organizationId=ORG_ID"
      );

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load roles");
      }

      setRoles(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  /* =========================================================
   * UI
   * =======================================================*/
  if (loading) {
    return (
      <div className="p-6 text-gray-500">Loading roles...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">{error}</div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">
          Roles Management
        </h1>

        <button className="px-4 py-2 bg-black text-white rounded">
          + Create Role
        </button>
      </div>

      <div className="grid gap-3">
        {roles.map((role) => (
          <div
            key={role._id}
            className="border rounded p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{role.name}</div>
              <div className="text-sm text-gray-500">
                {role.code}
              </div>
            </div>

            <button className="text-sm px-3 py-1 border rounded">
              Manage
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
