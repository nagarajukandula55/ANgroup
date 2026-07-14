import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getApiBaseUrl } from './api/client';

interface Business {
  _id: string;
  name: string;
  brandName?: string;
}

interface Session {
  user: any;
  businesses: Business[];
  activeBusinessId: string;
  setActiveBusinessId: (id: string) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export function SessionProvider({
  children,
  onUnauthenticated,
}: {
  children: React.ReactNode;
  onUnauthenticated: () => void;
}) {
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState('');

  const refresh = async () => {
    const base = await getApiBaseUrl();
    if (!base) {
      onUnauthenticated();
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      setBusinesses(data.businesses || []);
      setActiveBusinessId((prev) => prev || data.businesses?.[0]?._id || '');
    } catch {
      onUnauthenticated();
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  return (
    <SessionContext.Provider
      value={{ user, businesses, activeBusinessId, setActiveBusinessId, refresh, logout: onUnauthenticated }}
    >
      {children}
    </SessionContext.Provider>
  );
}
