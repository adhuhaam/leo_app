import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase, getAccessToken as getSupabaseToken } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  permissions: string[];
};

type AuthContextValue = {
  session: Session | null;
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === "true";
const DEV_TOKEN_KEY = "leo_dev_token";

async function getAccessToken(): Promise<string | null> {
  if (DEV_AUTH) {
    return localStorage.getItem(DEV_TOKEN_KEY);
  }
  return getSupabaseToken();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (DEV_AUTH) localStorage.removeItem(DEV_TOKEN_KEY);
      setUser(null);
      return;
    }
    const data = await res.json();
    setUser(data.user ?? null);
  }, []);

  useEffect(() => {
    setAuthTokenGetter(getAccessToken);

    if (DEV_AUTH) {
      fetchProfile().finally(() => setIsLoading(false));
      return;
    }

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
        fetchProfile().then(() => qc.invalidateQueries());
      } else {
        setUser(null);
        qc.clear();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [fetchProfile, qc]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (DEV_AUTH) {
        const res = await fetch("/api/dev/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Login failed");
        }
        const data = await res.json();
        localStorage.setItem(DEV_TOKEN_KEY, data.access_token);
        await fetchProfile();
        await qc.invalidateQueries();
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await fetchProfile();
      await qc.invalidateQueries();
    },
    [fetchProfile, qc],
  );

  const signOut = useCallback(async () => {
    if (DEV_AUTH) {
      localStorage.removeItem(DEV_TOKEN_KEY);
      setUser(null);
      qc.clear();
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    qc.clear();
  }, [qc]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.roles.includes("super_admin")) return true;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const hasRole = useCallback((role: string) => user?.roles.includes(role) ?? false, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      signIn,
      signOut,
      hasPermission,
      hasRole,
      refreshProfile: fetchProfile,
    }),
    [session, user, isLoading, signIn, signOut, hasPermission, hasRole, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { DEV_AUTH };
