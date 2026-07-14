import React, { useState } from 'react';
import { HashRouter, NavLink, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Compose from './pages/Compose';
import AvatarStudio from './pages/Avatar';
import Automation from './pages/Automation';
import { SessionProvider, useSession } from './context';

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  if (authed !== true) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <SessionProvider onUnauthenticated={() => setAuthed(false)}>
      <HashRouter>
        <Shell />
      </HashRouter>
    </SessionProvider>
  );
}

function Shell() {
  const { businesses, activeBusinessId, setActiveBusinessId, user, logout } = useSession();

  return (
    <div className="app-shell">
      <div className="sidebar">
        <h1>ANgroup Social</h1>
        <NavItem to="/">Dashboard</NavItem>
        <NavItem to="/compose">Compose</NavItem>
        <NavItem to="/channels">Channels</NavItem>
        <NavItem to="/avatar">Avatar Studio</NavItem>
        <NavItem to="/automation">Auto-pilot</NavItem>

        <div style={{ marginTop: 'auto' }}>
          {businesses.length > 1 && (
            <select value={activeBusinessId} onChange={(e) => setActiveBusinessId(e.target.value)} style={{ marginBottom: 10 }}>
              {businesses.map((b) => <option key={b._id} value={b._id}>{b.brandName || b.name}</option>)}
            </select>
          )}
          <div className="muted" style={{ padding: '0 12px 6px' }}>{user?.name}</div>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={logout}>Sign out</button>
        </div>
      </div>
      <div className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compose" element={<Compose />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/avatar" element={<AvatarStudio />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      {children}
    </NavLink>
  );
}
