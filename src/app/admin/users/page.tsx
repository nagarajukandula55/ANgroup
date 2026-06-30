'use client';

import { useState, useEffect, useCallback } from 'react';

interface Role {
  _id: string;
  name: string;
  code: string;
}

interface EmployeeProfile {
  employeeId: string;
  department?: string;
  designation?: string;
  employmentType?: string;
  joiningDate?: string;
}

interface VendorProfile {
  vendorId: string;
  companyName?: string;
  gstNumber?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  roles: Role[];
  employeeProfile?: EmployeeProfile;
  vendorProfile?: VendorProfile;
}

interface Stats {
  total: number;
  active: number;
  employees: number;
  vendors: number;
  customers: number;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SUPER_ADMIN: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  ADMIN: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
  MANAGER: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
  EMPLOYEE: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  VENDOR: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
  CUSTOMER: { bg: 'bg-zinc-500/20', text: 'text-zinc-300', border: 'border-zinc-500/30' },
};

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-green-500',
  'bg-orange-500', 'bg-red-500', 'bg-indigo-500',
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getRoleColor(code: string) {
  return ROLE_COLORS[code] || { bg: 'bg-zinc-500/20', text: 'text-zinc-300', border: 'border-zinc-500/30' };
}

const TABS = ['All', 'Employees', 'Vendors', 'Customers', 'Admins'];
const TAB_ROLE_MAP: Record<string, string> = {
  Employees: 'EMPLOYEE',
  Vendors: 'VENDOR',
  Customers: 'CUSTOMER',
  Admins: 'ADMIN',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [showPanel, setShowPanel] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, employees: 0, vendors: 0, customers: 0 });
  const [employeeCount, setEmployeeCount] = useState(0);
  const [vendorCount, setVendorCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    department: '',
    designation: '',
    employmentType: 'FULL_TIME',
    joiningDate: '',
    companyName: '',
    gstNumber: '',
    contactPerson: '',
    phone: '',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchTerm) params.set('search', searchTerm);
      if (activeTab !== 'All' && TAB_ROLE_MAP[activeTab]) params.set('role', TAB_ROLE_MAP[activeTab]);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      const list: User[] = data.users || [];
      setUsers(list);

      // Compute stats from full unfiltered list when on "All"
      const allRes = await fetch('/api/admin/users?limit=500');
      const allData = await allRes.json();
      const all: User[] = allData.users || [];
      const empCount = all.filter((u) => u.roles.some((r) => r.code === 'EMPLOYEE')).length;
      const venCount = all.filter((u) => u.roles.some((r) => r.code === 'VENDOR')).length;
      setEmployeeCount(empCount);
      setVendorCount(venCount);
      setStats({
        total: allData.total || all.length,
        active: all.filter((u) => u.status === 'ACTIVE').length,
        employees: empCount,
        vendors: venCount,
        customers: all.filter((u) => u.roles.some((r) => r.code === 'CUSTOMER')).length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, activeTab]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  function openAdd() {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'EMPLOYEE', department: '', designation: '', employmentType: 'FULL_TIME', joiningDate: '', companyName: '', gstNumber: '', contactPerson: '', phone: '' });
    setShowPanel(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.roles[0]?.code || 'EMPLOYEE',
      department: user.employeeProfile?.department || '',
      designation: user.employeeProfile?.designation || '',
      employmentType: user.employeeProfile?.employmentType || 'FULL_TIME',
      joiningDate: user.employeeProfile?.joiningDate?.slice(0, 10) || '',
      companyName: user.vendorProfile?.companyName || '',
      gstNumber: user.vendorProfile?.gstNumber || '',
      contactPerson: '',
      phone: '',
    });
    setShowPanel(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { name: formData.name, email: formData.email, role: formData.role };
      if (!editingUser) body.password = formData.password;
      if (formData.role === 'EMPLOYEE') {
        body.employeeData = { department: formData.department, designation: formData.designation, employmentType: formData.employmentType, joiningDate: formData.joiningDate || undefined };
      }
      if (formData.role === 'VENDOR') {
        body.vendorData = { companyName: formData.companyName, gstNumber: formData.gstNumber, contactPerson: formData.contactPerson, phone: formData.phone };
      }
      const url = editingUser ? `/api/admin/users/${editingUser._id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setShowPanel(false);
      fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(user: User) {
    await fetch(`/api/admin/users/${user._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    });
    fetchUsers();
  }

  const previewId = !editingUser
    ? formData.role === 'EMPLOYEE'
      ? `EMP-${String(employeeCount + 1).padStart(3, '0')}`
      : formData.role === 'VENDOR'
      ? `VEN-${String(vendorCount + 1).padStart(3, '0')}`
      : null
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage users, roles, and access across your organization</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.total, color: 'text-white' },
          { label: 'Active', value: stats.active, color: 'text-green-400' },
          { label: 'Employees', value: stats.employees, color: 'text-blue-400' },
          { label: 'Vendors', value: stats.vendors, color: 'text-green-400' },
          { label: 'Customers', value: stats.customers, color: 'text-zinc-300' },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <p className="text-zinc-400 text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div className="flex gap-0 border-b border-white/[0.08] flex-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${activeTab === tab ? 'text-blue-400' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {tab}
              {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <svg className="w-12 h-12 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['User', 'ID', 'Role', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wider ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((user) => {
                const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                const primaryRole = user.roles[0];
                const roleColor = getRoleColor(primaryRole?.code || '');
                const profileId = user.employeeProfile?.employeeId || user.vendorProfile?.vendorId;
                return (
                  <tr key={user._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${getAvatarColor(user.name)}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-zinc-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {profileId ? (
                        <span className="text-xs font-mono text-zinc-300 bg-white/[0.05] px-2 py-1 rounded">{profileId}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {primaryRole ? (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}>
                          {primaryRole.code}
                        </span>
                      ) : <span className="text-xs text-zinc-600">No role</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                        {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(user)} title="Edit" className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => { window.location.href = `/admin/users/${user._id}`; }} title="View Profile" className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleStatus(user)}
                          title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-colors ${user.status === 'ACTIVE' ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'}`}
                        >
                          {user.status === 'ACTIVE' ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-over panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
          <div className="w-96 bg-zinc-900 border-l border-white/[0.08] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
              <h2 className="text-lg font-semibold text-white">{editingUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowPanel(false)} className="text-zinc-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Full Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Email Address</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600" placeholder="john@example.com" />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
                  <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600" placeholder="••••••••" />
                </div>
              )}
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full bg-zinc-800 border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50">
                  {['ADMIN', 'MANAGER', 'EMPLOYEE', 'VENDOR', 'CUSTOMER'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {previewId && (
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-300">Will be assigned: <span className="font-mono font-semibold">{previewId}</span></p>
                </div>
              )}

              {formData.role === 'EMPLOYEE' && (
                <div className="space-y-4 pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Employee Details</p>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Department</label>
                    <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600" placeholder="Engineering" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Designation</label>
                    <input type="text" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600" placeholder="Software Engineer" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Employment Type</label>
                    <select value={formData.employmentType} onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })} className="w-full bg-zinc-800 border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50">
                      {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'].map((t) => (
                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Joining Date</label>
                    <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50" />
                  </div>
                </div>
              )}

              {formData.role === 'VENDOR' && (
                <div className="space-y-4 pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Vendor Details</p>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Company Name *</label>
                    <input type="text" required value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600" placeholder="Acme Corp Pvt Ltd" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">GST Number</label>
                    <input type="text" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600" placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Contact Person</label>
                    <input type="text" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600" placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/50 placeholder-zinc-600" placeholder="+91 98765 43210" />
                  </div>
                </div>
              )}

              <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-medium transition-colors mt-2">
                {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
