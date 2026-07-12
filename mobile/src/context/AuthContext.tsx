import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import * as auth from "@/api/auth";

interface AuthContextValue {
  user: any | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const me = await auth.getMe();
    setUser(me);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function login(identifier: string, password: string) {
    await auth.login(identifier, password);
    await refresh();
  }

  async function logout() {
    await auth.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used within an <AuthProvider>");
  return ctx;
}
