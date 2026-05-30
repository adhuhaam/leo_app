import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import leoLogo from "@assets/image_1778408412841.png";
import { useAuth, DEV_AUTH } from "@/context/auth";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate("/");
    } catch {
      setError("Invalid email or password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-app-shell flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="px-6 py-2 mb-6 flex items-center justify-center">
          <img
            src={leoLogo}
            alt="LEO Employment Services"
            className="w-full h-auto max-h-24 object-contain"
          />
        </div>

        <div className="rounded-2xl bg-card border border-card-border shadow-lg p-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Sign in</h1>
              <p className="text-xs text-muted-foreground">
                {DEV_AUTH
                  ? "Local dev mode — use admin@local.dev / leo123 (see .env)"
                  : "Use your staff account to continue."}
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="form-login">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={loading}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                data-testid="input-password"
              />
            </div>

            {error && (
              <div
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                data-testid="text-login-error"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || !password}
              data-testid="button-submit-login"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          LEO OS · Employment Operations
        </p>
      </div>
    </div>
  );
}
