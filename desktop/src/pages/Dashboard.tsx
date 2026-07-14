import React, { useEffect, useState } from 'react';
import { useSession } from '../context';
import { api } from '../api/client';

export default function Dashboard() {
  const { activeBusinessId } = useSession();
  const [stats, setStats] = useState({ total: 0, postedToday: 0, scheduled: 0, failed: 0 });
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!activeBusinessId) return;
    api.listPosts(activeBusinessId, { limit: '10' }).then((d) => {
      setStats(d.stats);
      setPosts(d.posts);
    });
  }, [activeBusinessId]);

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="grid grid-3" style={{ margin: '18px 0' }}>
        <Stat label="Total posts" value={stats.total} />
        <Stat label="Posted today" value={stats.postedToday} />
        <Stat label="Scheduled" value={stats.scheduled} />
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent activity</h3>
        <table>
          <thead>
            <tr>
              <th>Platform</th>
              <th>Caption</th>
              <th>Status</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p._id}>
                <td>{p.platform}</td>
                <td>{(p.caption || '').slice(0, 60)}</td>
                <td><StatusBadge status={p.status} /></td>
                <td className="muted">{new Date(p.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">No posts yet — head to Compose to create one.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    POSTED: 'badge-green',
    SCHEDULED: 'badge-amber',
    FAILED: 'badge-red',
    DRAFT: 'badge-gray',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}
