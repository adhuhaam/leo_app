import "../../lib/env/load-env.ts";
import { eq } from "drizzle-orm";
import {
  db,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
  deploymentTypesTable,
  usersTable,
  userRolesTable,
} from "@workspace/db";

const MODULES = [
  "dashboard",
  "passports",
  "clients",
  "loa",
  "billing",
  "expenses",
  "companies",
  "users",
  "settings",
] as const;

const ACTIONS = ["read", "write", "delete", "admin"] as const;

const ROLE_DEFINITIONS = [
  {
    slug: "super_admin",
    name: "Super Admin",
    description: "Full system access including user management",
    permissions: "all" as const,
  },
  {
    slug: "admin",
    name: "Admin",
    description: "Operational access across all modules and settings",
    permissions: MODULES.flatMap((m) =>
      ACTIONS.filter((a) => !(m === "users" && a === "admin")).map((a) => `${m}.${a}`),
    ),
  },
  {
    slug: "employee",
    name: "Employee",
    description: "Day-to-day recruitment operations",
    permissions: [
      "dashboard.read",
      "passports.read",
      "passports.write",
      "clients.read",
      "loa.read",
      "loa.write",
      "billing.read",
      "companies.read",
    ],
  },
];

const DEPLOYMENT_TYPES = [
  { slug: "recruitment", name: "Recruitment", description: "Standard recruitment placement" },
  { slug: "casual", name: "Casual Worker", description: "Casual / temporary worker deployment" },
  { slug: "contract", name: "Contract", description: "Fixed-term contract employment" },
  { slug: "temporary", name: "Temporary", description: "Short-term temporary assignment" },
];

const LOCAL_DEV_USERS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "admin@local.dev",
    fullName: "Local Admin",
    roleSlug: "super_admin",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "employee@local.dev",
    fullName: "Local Employee",
    roleSlug: "employee",
  },
] as const;

async function seedDevUsers() {
  if (process.env["DEV_AUTH"] !== "true") {
    console.log("DEV_AUTH is not true — skip local dev user seed");
    return;
  }

  for (const dev of LOCAL_DEV_USERS) {
    await db
      .insert(usersTable)
      .values({
        id: dev.id,
        email: dev.email,
        fullName: dev.fullName,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: { email: dev.email, fullName: dev.fullName, isActive: true },
      });

    const [role] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.slug, dev.roleSlug))
      .limit(1);

    if (role) {
      await db
        .insert(userRolesTable)
        .values({ userId: dev.id, roleId: role.id })
        .onConflictDoNothing();
    }
  }

  console.log("Local dev users seeded (password from DEV_PASSWORD in .env):");
  for (const dev of LOCAL_DEV_USERS) {
    console.log(`  • ${dev.email} (${dev.roleSlug})`);
  }
}

async function seedPermissions() {
  const slugs = MODULES.flatMap((m) => ACTIONS.map((a) => `${m}.${a}`));
  for (const slug of slugs) {
    const [module, action] = slug.split(".") as [string, string];
    await db
      .insert(permissionsTable)
      .values({ slug, module, action, description: `${action} ${module}` })
      .onConflictDoNothing({ target: permissionsTable.slug });
  }
}

async function seedRoles() {
  const allPerms = await db.select().from(permissionsTable);
  const permBySlug = new Map(allPerms.map((p) => [p.slug, p.id]));

  for (const role of ROLE_DEFINITIONS) {
    const [row] = await db
      .insert(rolesTable)
      .values({ slug: role.slug, name: role.name, description: role.description })
      .onConflictDoUpdate({
        target: rolesTable.slug,
        set: { name: role.name, description: role.description },
      })
      .returning();

    const permSlugs =
      role.permissions === "all" ? [...permBySlug.keys()] : role.permissions;

    for (const slug of permSlugs) {
      const permissionId = permBySlug.get(slug);
      if (!permissionId || !row) continue;
      await db
        .insert(rolePermissionsTable)
        .values({ roleId: row.id, permissionId })
        .onConflictDoNothing();
    }
  }
}

async function seedDeploymentTypes() {
  for (const dt of DEPLOYMENT_TYPES) {
    await db.insert(deploymentTypesTable).values(dt).onConflictDoNothing({
      target: deploymentTypesTable.slug,
    });
  }
}

async function assignSuperAdmin() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  if (!email) {
    console.log("SEED_SUPER_ADMIN_EMAIL not set — skip super admin assignment");
    return;
  }

  const [superAdminRole] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.slug, "super_admin"))
    .limit(1);

  if (!superAdminRole) return;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    console.log(`No app user found for ${email} — sign in once via the app first`);
    return;
  }

  await db
    .insert(userRolesTable)
    .values({ userId: user.id, roleId: superAdminRole.id })
    .onConflictDoNothing();

  console.log(`Assigned super_admin to ${email}`);
}

async function main() {
  console.log("Seeding roles, permissions, deployment types…");
  await seedPermissions();
  await seedRoles();
  await seedDeploymentTypes();
  await seedDevUsers();
  await assignSuperAdmin();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
