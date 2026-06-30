'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Party {
  name: string;
  email: string;
  role: string;
}

interface Agreement {
  _id: string;
  title: string;
  templateType: string;
  parties: Party[];
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'PARTIALLY_SIGNED' | 'FULLY_SIGNED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  expiresAt?: string;
}

interface Stats {
  total: number;
  DRAFT: number;
  PENDING_SIGNATURE: number;
  PARTIALLY_SIGNED: number;
  FULLY_SIGNED: number;
  EXPIRED: number;
  CANCELLED: number;
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  PENDING_SIGNATURE: { label: 'Pending Signature', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  PARTIALLY_SIGNED: { label: 'Partially Signed', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  FULLY_SIGNED: { label: 'Fully Signed', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  EXPIRED: { label: 'Expired', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-900/20 text-red-400 border-red-900/30' },
};

const TEMPLATE_LABELS: Record<string, string> = {
  NDA: 'NDA',
  VENDOR_SUPPLY: 'Vendor Supply',
  EMPLOYMENT: 'Employment',
  SERVICE_AGREEMENT: 'Service Agreement',
  MOU: 'MOU',
  CUSTOM: 'Custom',
};

const FILTER_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'PENDING_SIGNATURE', label: 'Pending' },
  { key: 'PARTIALLY_SIGNED', label: 'Partial' },
  { key: 'FULLY_SIGNED', label: 'Signed' },
  { key: 'EXPIRED', label: 'Expired' },
];

export default function AgreementsPage() {
  const router = useRouter();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, DRAFT: 0, PENDING_SIGNATURE: 0, PARTIALLY_SIGNED: 0,
    FULLY_SIGNED: 0, EXPIRED: 0, CANCELLED: 0,
  });
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('selectedBusinessId') || localStorage.getItem('businessId');
    if (stored) setBusinessId(stored);
  }, []);

  const fetchAgreements = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId });
      if (activeFilter !== 'ALL') params.set('status', activeFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/agreements?${params}`);
      const data = await res.json();
      if (res.ok) {
        setAgreements(data.agreements || []);
        setStats(data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch agreements:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId, activeFilter, search]);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const handleSendForSigning = async (id: string) => {
    if (!confirm('Send this agreement to all parties for signing?')) return;
    try {
      const res = await fetch(`/api/agreements/${id}/send`, { method: 'POST' });
      if (res.ok) {
        fetchAgreements();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send agreement');
      }
    } catch {
      alert('Failed to send agreement');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this agreement?')) return;
    try {
      const res = await fetch(`/api/agreements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAgreements();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel agreement');
      }
    } catch {
      alert('Failed to cancel agreement');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Agreements</h1>
            <p className="text-gray-400 mt-1">Manage legally binding agreements with Indian law compliance</p>
          </div>
          <button
            onClick={() => router.push('/agreements/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20"
          >
            <span className="text-lg">+</span>
            New Agreement
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <p className="text-gray-400 text-sm">Total Agreements</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-5">
            <p className="text-yellow-400 text-sm">Pending Signature</p>
            <p className="text-3xl font-bold text-yellow-300 mt-1">
              {stats.PENDING_SIGNATURE + stats.PARTIALLY_SIGNED}
            </p>
          </div>
          <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 rounded-2xl p-5">
            <p className="text-green-400 text-sm">Fully Signed</p>
            <p className="text-3xl font-bold text-green-300 mt-1">{stats.FULLY_SIGNED}</p>
          </div>
          <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-2xl p-5">
            <p className="text-red-400 text-sm">Expired</p>
            <p className="text-3xl font-bold text-red-300 mt-1">{stats.EXPIRED}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 flex-wrap">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search agreements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm"
          />
        </div>

        {/* Agreements Table */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : agreements.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-400 text-lg">No agreements found</p>
              <p className="text-gray-600 text-sm mt-1">Create your first agreement to get started</p>
              <button
                onClick={() => router.push('/agreements/new')}
                className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition-colors"
              >
                Create Agreement
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Title</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Type</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Parties</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Status</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Created</th>
                    <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((agreement) => (
                    <tr
                      key={agreement._id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/agreements/${agreement._id}`)}
                          className="text-white font-medium hover:text-blue-400 transition-colors text-left"
                        >
                          {agreement.title}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 text-sm">
                          {TEMPLATE_LABELS[agreement.templateType] || agreement.templateType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {agreement.parties.slice(0, 2).map((p, i) => (
                            <div key={i} className="text-sm">
                              <span className="text-white">{p.name}</span>
                              <span className="text-gray-500 text-xs ml-1">({p.role})</span>
                            </div>
                          ))}
                          {agreement.parties.length > 2 && (
                            <span className="text-gray-500 text-xs">
                              +{agreement.parties.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                            STATUS_CONFIG[agreement.status]?.color || 'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {STATUS_CONFIG[agreement.status]?.label || agreement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(agreement.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/agreements/${agreement._id}`)}
                            className="px-3 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors"
                          >
                            View
                          </button>
                          {agreement.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => router.push(`/agreements/${agreement._id}?edit=true`)}
                                className="px-3 py-1 text-xs bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleSendForSigning(agreement._id)}
                                className="px-3 py-1 text-xs bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-600/30 transition-colors"
                              >
                                Send
                              </button>
                            </>
                          )}
                          {agreement.status === 'FULLY_SIGNED' && (
                            <button
                              onClick={() => alert('PDF download would be available in production with a PDF generation service.')}
                              className="px-3 py-1 text-xs bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-600/30 transition-colors"
                            >
                              Download PDF
                            </button>
                          )}
                          {!['FULLY_SIGNED', 'CANCELLED', 'EXPIRED'].includes(agreement.status) && (
                            <button
                              onClick={() => handleCancel(agreement._id)}
                              className="px-3 py-1 text-xs bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          All agreements are governed by Indian law. Electronic signatures are valid under the Information Technology Act, 2000.
        </p>
      </div>
    </div>
  );
}
