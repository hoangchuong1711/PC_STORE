"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, type AuthUser } from "../lib/auth-api";

type Session = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Session | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const data = await authApi.me();
      setUser(data);
      setError("");
    } catch (cause) {
      setUser(null);
      let errMsg = "Lỗi xác thực người dùng";
      if (cause instanceof Error) {
        errMsg = cause.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const result = await authApi.login(email, password);
      setUser(result);
      setError("");
      return result;
    } catch (cause) {
      let errMsg = "Đăng nhập thất bại";
      if (cause instanceof Error) {
        errMsg = cause.message;
      }
      setError(errMsg);
      throw cause;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // Bỏ qua lỗi logout nếu session đã hết hạn
    } finally {
      setUser(null);
      setError("");
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, error, refresh, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const session = useContext(AuthContext);
  if (!session) {
    throw new Error("AuthProvider is required");
  }
  return session;
}
