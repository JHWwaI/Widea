"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string | null;
  userType: string | null;
  planType: string;
  creditBalance: number;
  isAdmin: boolean;
}

interface AuthCtx {
  user: User | null;
  token: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  setUserType: (userType: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateCredit: (balance: number) => void;
}

const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (t: string) => {
    try {
      const data = await api<User>("GET", "/api/auth/me", undefined, t);
      setUser(data);
    } catch {
      setUser(null);
      setToken("");
      localStorage.removeItem("widea_token");
    }
  }, []);

  useEffect(() => {
    const t = localStorage.getItem("widea_token") || "";
    if (t) {
      setToken(t);
      fetchMe(t).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const data = await api<{ token: string }>("POST", "/api/auth/login", { email, password });
    setToken(data.token);
    localStorage.setItem("widea_token", data.token);
    await fetchMe(data.token);
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await api<{ token: string }>("POST", "/api/auth/register", { email, password, name });
    setToken(data.token);
    localStorage.setItem("widea_token", data.token);
    await fetchMe(data.token);
  };

  const setUserType = async (userType: string) => {
    await api("POST", "/api/auth/set-user-type", { userType }, token);
    await fetchMe(token);
  };

  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("widea_token");
  };

  const refreshUser = async () => {
    if (token) await fetchMe(token);
  };

  const updateCredit = (balance: number) => {
    setUser((prev) => (prev ? { ...prev, creditBalance: balance } : null));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, setUserType, logout, refreshUser, updateCredit }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
