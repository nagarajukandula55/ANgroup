import React, { createContext, useContext, useEffect, useState } from "react";
import {
  clearStoredUser,
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken as persistToken,
  StoredUser,
} from "@/api/client";

interface AuthState {
  isLoading: boolean;
  isSignedIn: boolean;
  user: StoredUser | null;
  signIn: (token: string, user: StoredUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    Promise.all([getToken(), getStoredUser()]).then(([token, storedUser]) => {
      setIsSignedIn(!!token);
      setUser(storedUser);
      setIsLoading(false);
    });
  }, []);

  async function signIn(token: string, newUser: StoredUser) {
    await persistToken(token);
    await setStoredUser(newUser);
    setUser(newUser);
    setIsSignedIn(true);
  }

  async function signOut() {
    await clearToken();
    await clearStoredUser();
    setUser(null);
    setIsSignedIn(false);
  }

  return (
    <AuthContext.Provider value={{ isLoading, isSignedIn, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
