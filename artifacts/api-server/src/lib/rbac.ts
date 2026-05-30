import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  userRolesTable,
  rolesTable,
  rolePermissionsTable,
  permissionsTable,
} from "@workspace/db";

/** Load or create user profile and attach roles/permissions to req.user. */
export async function loadUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const claims = req.authClaims;
  if (!claims) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.id, claims.sub)).limit(1);

    if (!user) {
      const email = claims.email;
      if (!email) {
        res.status(401).json({ error: "User email not found in token" });
        return;
      }
      [user] = await db
        .insert(usersTable)
        .values({ id: claims.sub, email, fullName: email.split("@")[0] })
        .onConflictDoNothing()
        .returning();

      if (!user) {
        [user] = await db.select().from(usersTable).where(eq(usersTable.id, claims.sub)).limit(1);
      }

      // Assign default employee role on first login
      const [employeeRole] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.slug, "employee"))
        .limit(1);

      if (employeeRole && user) {
        await db
          .insert(userRolesTable)
          .values({ userId: user.id, roleId: employeeRole.id })
          .onConflictDoNothing();
      }
    }

    if (!user?.isActive) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }

    const roleRows = await db
      .select({ slug: rolesTable.slug })
      .from(userRolesTable)
      .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
      .where(eq(userRolesTable.userId, user.id));

    const roles = roleRows.map((r) => r.slug);

    const permRows = await db
      .select({ slug: permissionsTable.slug })
      .from(userRolesTable)
      .innerJoin(rolePermissionsTable, eq(userRolesTable.roleId, rolePermissionsTable.roleId))
      .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
      .where(eq(userRolesTable.userId, user.id));

    const permissions = [...new Set(permRows.map((p) => p.slug))];

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      permissions,
    };

    next();
  } catch (err) {
    req.log?.error({ err }, "Failed to load user profile");
    res.status(500).json({ error: "Failed to load user profile" });
  }
}

/** Factory: require a specific permission slug (e.g. "passports.read"). */
export function requirePermission(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const hasAll = required.every(
      (p) => req.user!.permissions.includes(p) || req.user!.roles.includes("super_admin"),
    );
    if (!hasAll) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

/** Check permission without middleware (for conditional logic in handlers). */
export function hasPermission(user: Express.Request["user"], permission: string): boolean {
  if (!user) return false;
  if (user.roles.includes("super_admin")) return true;
  return user.permissions.includes(permission);
}
