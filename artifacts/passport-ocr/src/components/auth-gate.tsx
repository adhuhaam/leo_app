import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import LoginPage from "@/pages/login";
import { useAuth } from "@/context/auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-app-shell">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
