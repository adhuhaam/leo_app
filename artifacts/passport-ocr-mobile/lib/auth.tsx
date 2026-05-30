import { setAuthTokenGetter } from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getAccessToken, supabase } from "@/lib/supabase";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  permissions: string[];
};

type AuthContextValue = {
  isLoading: boolean;
  isAuthed: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const apiBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";

async function fetchProfile(): Promise<AuthUser | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await fetch(`${apiBase}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const profile = await fetchProfile();
    setUser(profile);
  }, []);

  useEffect(() => {
    setAuthTokenGetter(getAccessToken);

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        fetchProfile().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchProfile().then(setUser);
      } else {
        setUser(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.roles.includes("super_admin")) return true;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthed: Boolean(session && user),
      user,
      login,
      logout,
      hasPermission,
      refresh,
    }),
    [isLoading, session, user, login, logout, hasPermission, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
