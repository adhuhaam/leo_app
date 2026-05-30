import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth";
import { getAccessToken } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  roles: { slug: string; name: string }[];
};

type Role = { id: number; slug: string; name: string };

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  async function authFetch(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    return fetch(`/api${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  async function load() {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        authFetch("/users"),
        authFetch("/roles"),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasPermission("users.read")) load();
  }, [hasPermission]);

  async function assignRole(userId: string, roleSlug: string) {
    const res = await authFetch(`/users/${userId}/roles`, {
      method: "PATCH",
      body: JSON.stringify({ roleSlugs: [roleSlug] }),
    });
    if (res.ok) {
      toast({ title: "Role updated" });
      await load();
    } else {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  }

  if (!hasPermission("users.read")) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center text-muted-foreground">
        You don&apos;t have permission to view users.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Manage staff access — Super Admin, Admin, Employee</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardHeader className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{u.fullName ?? u.email}</CardTitle>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {u.roles.map((r) => (
                      <Badge key={r.slug} variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        {r.name}
                      </Badge>
                    ))}
                    {!u.isActive && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                </div>
              </CardHeader>
              {hasPermission("users.admin") && (
                <CardContent className="pt-0 pb-4">
                  <div className="flex items-center gap-2">
                    <Select
                      value={u.roles[0]?.slug ?? "employee"}
                      onValueChange={(v) => assignRole(u.id, v)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Assign role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.slug} value={r.slug}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No users yet. Create accounts in Supabase Auth, then sign in once to register them here.
            </p>
          )}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <strong>Roles:</strong> Super Admin (full access) · Admin (operations + settings) · Employee (candidates, clients, LOA)
        </CardContent>
      </Card>
    </div>
  );
}
