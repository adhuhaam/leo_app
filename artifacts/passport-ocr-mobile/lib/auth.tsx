import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAuthStatusQueryKey,
  useGetAuthStatus,
  useLogin,
} from "@workspace/api-client-react";
import React, { createContext, useCallback, useContext, useMemo } from "react";

type AuthContextValue = {
  isLoading: boolean;
  isAuthed: boolean;
  login: (password: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useGetAuthStatus({
    query: {
      queryKey: getGetAuthStatusQueryKey(),
      retry: false,
      staleTime: 30_000,
    },
  });

  const loginMutation = useLogin();

  const login = useCallback(
    async (password: string) => {
      await loginMutation.mutateAsync({ data: { password } });
      await qc.invalidateQueries();
      await refetch();
    },
    [loginMutation, qc, refetch],
  );

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthed: Boolean((data as { authenticated?: boolean } | undefined)?.authenticated),
      login,
      refresh,
    }),
    [isLoading, data, login, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
