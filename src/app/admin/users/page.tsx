'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, UserCog, Loader2, Edit2, Eye } from 'lucide-react';

interface Role { _id: string; name: string; code: string }
interface EmployeeProfile { employeeId: string; department?: string; designation?: string; employmentType?: string; joiningDate?: string }
interface VendorProfile { vendorId: string; companyName?: string; gstNumber?: string }
interface User {
  _id: string; name: string; email: string; isActive: boolean; createdAt: string;
  roles: Role[]; employeeProfile?: EmployeeProfile; vendorProfile?: VendorProfile;
}
interface Stats { total: number; active: number; employees: number; vendors: number; customers: number }

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 border border-purple-200',
  ADMIN:       'bg-red-100 text-red-700 border border-red-200',
  MANAGER:     'bg-orange-100 text-orange-700 border border-orange-200',
  EMPLOYEE:    'bg-blue-100 text-blue-700 border border-blue-200',
  VENDOR:      'bg-green-100 text-green-700 border border-green-200',
  CUSTOMER:    'bg-gray-100 text-gray-600 border border-gray-200',
};

const AVATAR_COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500'];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getRoleColor   = (code: string) => ROLE_COLORS[code] || 'bg-gray-100 text-gray-600 border border-gray-200';

const TABS = ['All', 'Employees', 'Vendors', 'Customers', 'Admins'];
const TAB_ROLE_MAP: Record<string, string> = {
  Employees: 'EMPLOYEE', Vendors: 'VENDOR', Customers: 'CUSTOMER', Admins: 'ADMIN',
};

export default function UsersPage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab]   = useState('All');
  const [showPanel, setShowPanel]   = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [stats, setStats]           = useState<Stats>({ total: 0, active: 0, employees: 0, vendors: 0, customers: 0 });
  const [empCount, setEmpCount]     = useState(0);
  const [venCount, setVenCount]     = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '', email: '', username: '', password: '', role: 'EMPLOYEE',
    department: '', designation: '', employmentType: 'FULL_TIME', joiningDate: '',
    companyName: '', gstNumber: '', contactPerson: '', phone: '',
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsSuperAdmin(!!d?.user?.isSuperAdmin))
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchTerm) params.set('search', searchTerm);
      if (activeTab !== 'All' && TAB_ROLE_MAP[activeTab]) params.set('role', TAB_ROLE_MAP[activeTab]);
      const res  = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);

      // Stats from full list
      const allRes  = await fetch('/api/admin/users?limit=500');
      const allData = await allRes.json();
      const all: User[] = allData.users || [];
      const ec = all.filter(u => u.roles.some(r => r.code === 'EMPLOYEE')).length;
      const vc = all.filter(u => u.roles.some(r => r.code === 'VENDOR')).length;
      setEmpCount(ec); setVenCount(vc);
      setStats({
        total:     allData.total || all.length,
        active:    all.filter(u => u.isActive === true).length,   // ← use isActive not status
        employees: ec,
        vendors:   vc,
        customers: all.filter(u => u.roles.some(r => r.code === 'CUSTOMER')).length,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [searchTerm, activeTab]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  function openAdd() {
    setEditingUser(null);
    setFormError('');
    setFormData({ name: '', email: '', username: '', password: '', role: 'EMPLOYEE', department: '', designation: '', employmentType: 'FULL_TIME', joiningDate: '', companyName: '', gstNumber: '', contactPerson: '', phone: '' });
    setShowPanel(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setFormError('');
    setFormData({
      name: user.name, email: user.email, username: '', password: '', role: user.roles[0]?.code || 'EMPLOYEE',
      department: user.employeeProfile?.department || '', designation: user.employeeProfile?.designation || '',
      employmentType: user.employeeProfile?.employmentType || 'FULL_TIME',
      joiningDate: user.employeeProfile?.joiningDate?.slice(0, 10) || '',
      companyName: user.vendorProfile?.companyName || '', gstNumber: user.vendorProfile?.gstNumber || '',
      contactPerson: '', phone: '',
    });
    setShowPanel(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const body: Record<string, unknown> = { name: formData.name, email: formData.email, role: formData.role };
      if (!editingUser) {
        body.password = formData.password;
        if (formData.username.trim()) body.username = formData.username.trim();
      }
      if (formData.role === 'EMPLOYEE') {
        body.employeeData = { department: formData.department, designation: formData.designation, employmentType: formData.employmentType, joiningDate: formData.joiningDate || undefined };
      }
      if (formData.role === 'VENDOR') {
        body.vendorData = { companyName: formData.companyName, gstNumber: formData.gstNumber, contactPerson: formData.contactPerson, phone: formData.phone };
      }
      const url    = editingUser ? `/api/admin/users/${editingUser._id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data   = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowPanel(false);
        fetchUsers();
      } else {
        setFormError(data?.error || 'Failed to save user');
      }
    } catch (e) { console.error(e); setFormError('Failed to connect to server'); }
    finally { setSubmitting(false); }
  }

  async function toggleStatus(user: User) {
    // Send isActive (boolean) — User schema uses isActive, not status string
    await fetch(`/api/admin/users/${user._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    fetchUsers();
  }

  const previewId = !editingUser
    ? formData.role === 'EMPLOYEE' ? `EMP-${String(empCount + 1).padStart(3, '0')}`
    : formData.role === 'VENDOR'   ? `VEN-${String(venCount + 1).padStart(3, '0')}`
    : null : null;

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 placeholder-gray-400';
  const selectCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage users, roles, and access across your organization</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus size={15} /> Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats.total, color: 'text-gray-900' },
          { label: 'Active',      value: stats.active,    color: 'text-green-600' },
          { label: 'Employees',   value: stats.employees, color: 'text-blue-600' },
          { label: 'Vendors',     value: stats.vendors,   color: 'text-green-600' },
          { label: 'Customers',   value: stats.customers, color: 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name or email..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border border-gray-200 bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 shadow-sm w-72" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <UserCog className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-sm text-gray-400">No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['User', 'ID', 'Role', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => {
                const initials    = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const primaryRole = user.roles[0];
                const profileId   = user.employeeProfile?.employeeId || user.vendorProfile?.vendorId;
                const isActive    = user.isActive !== false;   // default true if undefined
                return (
                  <tr key={user._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${getAvatarColor(user.name)}`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {profileId
                        ? <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{profileId}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {primaryRole
                        ? <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRoleColor(primaryRole.code)}`}>{primaryRole.code}</span>
                        : <span className="text-xs text-gray-300">No role</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(user)} title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => { window.location.href = `/admin/users/${user._id}`; }} title="View"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => toggleStatus(user)}
                          title={isActive ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition text-xs font-medium px-2.5 py-1 rounded-full border ${isActive ? 'text-red-600 hover:bg-red-50 border-transparent' : 'text-green-600 hover:bg-green-50 border-transparent'}`}>
                          {isActive ? 'Deactivate' : 'Activate'}
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
          <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
          <div className="w-full max-w-md bg-white border-l border-gray-200 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{editingUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowPanel(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <span className="text-gray-600 text-lg leading-none">&times;</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {formError && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {formError}
                </div>
              )}
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={inputCls} placeholder="John Doe" />
              </div>
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className={inputCls} placeholder="john@example.com" />
              </div>
              {!editingUser && (
                <div>
                  <label className={labelCls}>User ID <span className="text-gray-400 font-normal">(optional, must be unique)</span></label>
                  <input type="text" value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className={inputCls} placeholder="e.g. jdoe" autoComplete="off" />
                </div>
              )}
              {!editingUser && (
                <div>
                  <label className={labelCls}>Password</label>
                  <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className={inputCls} placeholder="••••••••" />
                </div>
              )}
              <div>
                <label className={labelCls}>Role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className={selectCls}>
                  {[
                    // SUPER_ADMIN only ever offered to an already-super-admin
                    // caller — the API enforces this too, this is just so a
                    // regular admin never sees the option in the first place.
                    ...(isSuperAdmin ? ['SUPER_ADMIN'] : []),
                    'ADMIN', 'MANAGER', 'EMPLOYEE', 'VENDOR', 'CUSTOMER',
                  ].map(r => (
                    <option key={r} value={r}>{r === 'SUPER_ADMIN' ? 'Super Admin' : r}</option>
                  ))}
                </select>
              </div>

              {previewId && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs text-blue-700">Will be assigned: <span className="font-mono font-semibold">{previewId}</span></p>
                </div>
              )}

              {formData.role === 'EMPLOYEE' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Employee Details</p>
                  <div>
                    <label className={labelCls}>Department</label>
                    <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}
                      className={inputCls} placeholder="Engineering" />
                  </div>
                  <div>
                    <label className={labelCls}>Designation</label>
                    <input type="text" value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })}
                      className={inputCls} placeholder="Software Engineer" />
                  </div>
                  <div>
                    <label className={labelCls}>Employment Type</label>
                    <select value={formData.employmentType} onChange={e => setFormData({ ...formData, employmentType: e.target.value })} className={selectCls}>
                      {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'].map(t => (
                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Joining Date</label>
                    <input type="date" value={formData.joiningDate} onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>
              )}

              {formData.role === 'VENDOR' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Vendor Details</p>
                  <div>
                    <label className={labelCls}>Company Name *</label>
                    <input type="text" required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      className={inputCls} placeholder="Acme Corp Pvt Ltd" />
                  </div>
                  <div>
                    <label className={labelCls}>GST Number</label>
                    <input type="text" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                      className={inputCls} placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div>
                    <label className={labelCls}>Contact Person</label>
                    <input type="text" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                      className={inputCls} placeholder="Jane Smith" />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className={inputCls} placeholder="+91 98765 43210" />
                  </div>
                </div>
              )}

              <div className="pb-2">
                <button type="submit" disabled={submitting}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
