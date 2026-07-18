import React, { createContext, useContext, useEffect, useState } from "react";
import { clearToken, getToken, setToken as persistToken } from "@/api/client";

interface AuthState {
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    getToken().then((token) => {
      setIsSignedIn(!!token);
      setIsLoading(false);
    });
  }, []);

  async function signIn(token: string) {
    await persistToken(token);
    setIsSignedIn(true);
  }

  async function signOut() {
    await clearToken();
    setIsSignedIn(false);
  }

  return (
    <AuthContext.Provider value={{ isLoading, isSignedIn, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
