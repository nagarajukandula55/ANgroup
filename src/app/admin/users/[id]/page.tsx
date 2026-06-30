'use client';

import { use, useState, useEffect } from 'react';

interface Role {
  _id: string;
  name: string;
  code: string;
  permissions?: string[];
}

interface EmployeeProfile {
  employeeId: string;
  department?: string;
  designation?: string;
  employmentType?: string;
  joiningDate?: string;
  salary?: number;
  status?: string;
  reportingTo?: { name: string; email: string };
}

interface VendorProfile {
  vendorId: string;
  companyName?: string;
  gstNumber?: string;
  panNumber?: string;
  paymentTerms?: string;
  rating?: number;
  contactPerson?: string;
  phone?: string;
  category?: string;
  isApproved?: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: string;
  roles: Role[];
  employeeProfile?: EmployeeProfile;
  vendorProfile?: VendorProfile;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  ADMIN: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
  MANAGER: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
  EMPLOYEE: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  VENDOR: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
  CUSTOMER: { bg: 'bg-zinc-500/20', text: 'text-zinc-300', border: 'border-zinc-500/30' },
};

const AVATAR_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500'];

function getRoleColor(code: string) {
  return ROLE_COLORS[code] || { bg: 'bg-zinc-500/20', text: 'text-zinc-300', border: 'border-zinc-500/30' };
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm text-white">{value || '—'}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-zinc-600'}>★</span>
      ))}
    </div>
  );
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'access' | 'activity'>('profile');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [userRes, rolesRes] = await Promise.all([
          fetch(`/api/admin/users/${id}`),
          fetch('/api/admin/roles'),
        ]);
        const userData = await userRes.json();
        const rolesData = await rolesRes.json();
        if (userData.user) setUser(userData.user);
        if (rolesData.roles) setAvailableRoles(rolesData.roles);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function assignRole() {
    if (!selectedRoleToAssign) return;
    setAssigning(true);
    try {
      await fetch(`/api/users/${id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRoleToAssign }),
      });
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();
      if (data.user) setUser(data.user);
      setSelectedRoleToAssign('');
    } catch (e) {
      console.error(e);
    } finally {
      setAssigning(false);
    }
  }

  async function removeRole(roleId: string) {
    try {
      await fetch(`/api/users/${id}/roles/${roleId}`, { method: 'DELETE' });
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();
      if (data.user) setUser(data.user);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-lg">User not found</p>
          <a href="/admin/users" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">← Back to Users</a>
        </div>
      </div>
    );
  }

  const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarColor = AVATAR_COLORS[user.name.charCodeAt(0) % AVATAR_COLORS.length];
  const primaryRole = user.roles[0];
  const roleColor = getRoleColor(primaryRole?.code || '');

  const allPermissions = user.roles.flatMap((r) => r.permissions || []);
  const uniquePermissions = [...new Set(allPermissions)];

  const permissionsByModule: Record<string, string[]> = {};
  uniquePermissions.forEach((perm) => {
    const [module] = perm.split('.');
    const mod = module.charAt(0).toUpperCase() + module.slice(1);
    if (!permissionsByModule[mod]) permissionsByModule[mod] = [];
    permissionsByModule[mod].push(perm);
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Back button */}
      <a href="/admin/users" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Users
      </a>

      {/* User header card */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 ${avatarColor}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{user.name}</h1>
              {primaryRole && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}>
                  {primaryRole.code}
                </span>
              )}
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                {user.status}
              </span>
            </div>
            <p className="text-zinc-400 mt-1">{user.email}</p>
            {user.employeeProfile?.employeeId && (
              <p className="text-xs text-zinc-500 mt-1 font-mono">{user.employeeProfile.employeeId}</p>
            )}
            {user.vendorProfile?.vendorId && (
              <p className="text-xs text-zinc-500 mt-1 font-mono">{user.vendorProfile.vendorId}</p>
            )}
          </div>
          <a
            href={`/admin/users`}
            onClick={(e) => { e.preventDefault(); /* edit inline */ }}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-white/[0.08] mb-6">
        {(['profile', 'access', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-blue-400' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            {tab === 'access' ? 'Access & Roles' : tab === 'activity' ? 'Activity Log' : 'Profile'}
            {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Basic Information</h3>
            <div className="space-y-4">
              <InfoRow label="Full Name" value={user.name} />
              <InfoRow label="Email Address" value={user.email} />
              {user.phone && <InfoRow label="Phone" value={user.phone} />}
              <InfoRow label="Role" value={primaryRole?.code} />
              <InfoRow label="Status" value={user.status} />
              <InfoRow label="Member Since" value={new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
            </div>
          </div>

          {user.employeeProfile && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Employee Details</h3>
              </div>
              <div className="space-y-4">
                <InfoRow label="Employee ID" value={user.employeeProfile.employeeId} />
                <InfoRow label="Department" value={user.employeeProfile.department} />
                <InfoRow label="Designation" value={user.employeeProfile.designation} />
                <InfoRow label="Employment Type" value={user.employeeProfile.employmentType?.replace('_', ' ')} />
                <InfoRow label="Reporting To" value={user.employeeProfile.reportingTo?.name} />
                <InfoRow label="Joining Date" value={user.employeeProfile.joiningDate ? new Date(user.employeeProfile.joiningDate).toLocaleDateString('en-IN') : undefined} />
                <InfoRow label="Employee Status" value={user.employeeProfile.status} />
              </div>
            </div>
          )}

          {user.vendorProfile && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Vendor Details</h3>
              </div>
              <div className="space-y-4">
                <InfoRow label="Vendor ID" value={user.vendorProfile.vendorId} />
                <InfoRow label="Company Name" value={user.vendorProfile.companyName} />
                <InfoRow label="GST Number" value={user.vendorProfile.gstNumber} />
                <InfoRow label="PAN Number" value={user.vendorProfile.panNumber} />
                <InfoRow label="Payment Terms" value={user.vendorProfile.paymentTerms} />
                <InfoRow label="Category" value={user.vendorProfile.category} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-500">Rating</span>
                  <StarRating rating={user.vendorProfile.rating || 0} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-500">Approval Status</span>
                  <span className={`text-sm font-medium ${user.vendorProfile.isApproved ? 'text-green-400' : 'text-yellow-400'}`}>
                    {user.vendorProfile.isApproved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Access & Roles Tab */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Current Roles</h3>
            {user.roles.length === 0 ? (
              <p className="text-zinc-500 text-sm">No roles assigned yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role) => {
                  const rc = getRoleColor(role.code);
                  return (
                    <div key={role._id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${rc.bg} ${rc.border}`}>
                      <span className={`text-xs font-medium ${rc.text}`}>{role.name || role.code}</span>
                      <button
                        onClick={() => removeRole(role._id)}
                        className={`${rc.text} opacity-60 hover:opacity-100 transition-opacity`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Assign Role</h3>
            <div className="flex gap-3">
              <select
                value={selectedRoleToAssign}
                onChange={(e) => setSelectedRoleToAssign(e.target.value)}
                className="flex-1 bg-zinc-800 border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                <option value="">Select a role...</option>
                {availableRoles
                  .filter((r) => !user.roles.some((ur) => ur._id === r._id))
                  .map((role) => (
                    <option key={role._id} value={role._id}>{role.name || role.code}</option>
                  ))}
              </select>
              <button
                onClick={assignRole}
                disabled={!selectedRoleToAssign || assigning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium transition-colors"
              >
                {assigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>

          {uniquePermissions.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">
                Permissions
                <span className="ml-2 text-xs font-normal text-zinc-500 normal-case">({uniquePermissions.length} total)</span>
              </h3>
              <div className="space-y-4">
                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module}>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{module}</p>
                    <div className="flex flex-wrap gap-2">
                      {perms.map((perm) => (
                        <span key={perm} className="text-xs bg-white/[0.05] border border-white/[0.08] text-zinc-300 px-2.5 py-1 rounded-full font-mono">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-12 flex flex-col items-center justify-center">
          <svg className="w-12 h-12 text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-zinc-400 font-medium">No activity recorded yet</p>
          <p className="text-zinc-600 text-sm mt-1">User actions and login history will appear here once activity logging is enabled.</p>
        </div>
      )}
    </div>
  );
}
