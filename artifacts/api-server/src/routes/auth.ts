import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, userRolesTable, rolesTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/rbac";

const router: IRouter = Router();

router.get("/auth/me", requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles,
      permissions: user.permissions,
    },
  });
});

export default router;

/** User management routes — mounted separately with auth */
export const usersRouter: IRouter = Router();

usersRouter.get("/users", requireAuth, requirePermission("users.read"), async (_req, res) => {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      fullName: usersTable.fullName,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.email);

  const usersWithRoles = await Promise.all(
    rows.map(async (u) => {
      const roleRows = await db
        .select({ slug: rolesTable.slug, name: rolesTable.name })
        .from(userRolesTable)
        .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
        .where(eq(userRolesTable.userId, u.id));
      return { ...u, roles: roleRows };
    }),
  );

  res.json(usersWithRoles);
});

usersRouter.get("/roles", requireAuth, requirePermission("users.read"), async (_req, res) => {
  const roles = await db.select().from(rolesTable).orderBy(rolesTable.name);
  res.json(roles);
});

usersRouter.patch(
  "/users/:id/roles",
  requireAuth,
  requirePermission("users.admin"),
  async (req, res): Promise<void> => {
    const userId = String(req.params.id);
    const roleSlugs = req.body?.roleSlugs as string[] | undefined;
    if (!Array.isArray(roleSlugs)) {
      res.status(400).json({ error: "roleSlugs array required" });
      return;
    }

    const roles = await db.select().from(rolesTable);
    const roleIds = roles.filter((r) => roleSlugs.includes(r.slug)).map((r) => r.id);

    await db.delete(userRolesTable).where(eq(userRolesTable.userId, userId));
    for (const roleId of roleIds) {
      await db.insert(userRolesTable).values({ userId, roleId }).onConflictDoNothing();
    }

    res.sendStatus(204);
  },
);

usersRouter.patch(
  "/users/:id",
  requireAuth,
  requirePermission("users.admin"),
  async (req, res): Promise<void> => {
    const userId = String(req.params.id);
    const { fullName, isActive } = req.body ?? {};

    const updates: Partial<{ fullName: string; isActive: boolean }> = {};
    if (typeof fullName === "string") updates.fullName = fullName;
    if (typeof isActive === "boolean") updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    res.sendStatus(204);
  },
);

export { requireAuth };
