"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createAuthApi, type AuthUser } from "../lib/auth-api";

const api = createAuthApi();
type Session = {
  user: AuthUser | null; loading: boolean; error: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Session | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    try {
      const result = await api.me();
      if (current === revision.current) { setUser(result); setError(""); }
    } catch (cause) {
      if (current === revision.current) { setUser(null); setError((cause as Error).message); }
    } finally { if (current === revision.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const requestRevision = revision;
    const current = ++requestRevision.current;
    api.me().then((result) => {
      if (current === requestRevision.current) { setUser(result); setError(""); }
    }).catch((cause: Error) => {
      if (current === requestRevision.current) { setUser(null); setError(cause.message); }
    }).finally(() => {
      if (current === requestRevision.current) setLoading(false);
    });
    const onFocus = () => { setLoading(true); void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { ++requestRevision.current; window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  async function login(email: string, password: string) {
    ++revision.current;
    try {
      const result = await api.login(email, password);
      ++revision.current;
      setUser(result); setError("");
      return result;
    } finally { setLoading(false); }
  }
  async function logout() {
    await api.logout();
    ++revision.current;
    setUser(null); setLoading(false); setError("");
  }
  return <AuthContext.Provider value={{ user, loading, error, refresh, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const session = useContext(AuthContext);
  if (!session) throw new Error("AuthProvider is required");
  return session;
}
