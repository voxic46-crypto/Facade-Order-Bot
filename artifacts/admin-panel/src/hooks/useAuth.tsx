import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface AuthState {
  authenticated: boolean;
  username: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    username: null,
    loading: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { authenticated: boolean; username: string };
        setState({ authenticated: data.authenticated, username: data.username, loading: false });
      } else {
        setState({ authenticated: false, username: null, loading: false });
      }
    } catch {
      setState({ authenticated: false, username: null, loading: false });
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (username: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; username?: string };
      if (res.ok && data.ok) {
        setState({ authenticated: true, username: data.username ?? username, loading: false });
        return {};
      }
      return { error: data.error ?? "Ошибка входа" };
    } catch {
      return { error: "Нет соединения с сервером" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    setState({ authenticated: false, username: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
