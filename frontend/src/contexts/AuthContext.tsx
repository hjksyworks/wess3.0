import * as React from "react";
import { api } from "@/lib/api";
import type { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (loginId: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

const STORAGE_USER = "wess_user";
const STORAGE_TOKEN = "wess_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_USER);
    const token = localStorage.getItem(STORAGE_TOKEN);
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_USER);
        localStorage.removeItem(STORAGE_TOKEN);
      }
    }
    setLoading(false);
  }, []);

  const login = React.useCallback(async (loginId: string, password: string) => {
    const res = await api.post("/auth/login", { loginId, password });
    const data = res.data.user as { id: number; name: string; role: AuthUser["role"]; studentId?: number | null };
    const authUser: AuthUser = {
      id: data.id,
      name: data.name,
      role: data.role,
      studentId: data.studentId ?? undefined,
    };
    const token = res.data.token as string;

    localStorage.setItem(STORAGE_USER, JSON.stringify(authUser));
    localStorage.setItem(STORAGE_TOKEN, token);
    setUser(authUser);
    return authUser;
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
