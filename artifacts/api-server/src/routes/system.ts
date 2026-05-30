import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { UpdateSystemSettingsBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { requirePermission } from "../lib/rbac";

const MAX_IMAGE_BYTES = 600 * 1024;
const DATA_URL_RE = /^data:image\/(png|jpe?g|svg\+xml|webp);base64,([A-Za-z0-9+/=]+)$/;

function validateImageDataUrl(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return `${label} must be a string`;
  const m = value.match(DATA_URL_RE);
  if (!m) return `${label} must be a data:image/(png|jpeg|webp|svg+xml);base64 URL`;
  const base64Len = m[2].length;
  const padding = m[2].endsWith("==") ? 2 : m[2].endsWith("=") ? 1 : 0;
  const decodedBytes = Math.floor((base64Len * 3) / 4) - padding;
  if (decodedBytes > MAX_IMAGE_BYTES) {
    return `${label} exceeds ${(MAX_IMAGE_BYTES / 1024).toFixed(0)} KB limit`;
  }
  return null;
}

async function readSettings() {
  const rows = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.id, 1))
    .limit(1);
  if (rows.length > 0) return rows[0];
  await db.insert(appSettingsTable).values({ id: 1 }).onConflictDoNothing();
  const again = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.id, 1))
    .limit(1);
  return again[0];
}

function publicShape(row: typeof appSettingsTable.$inferSelect) {
  return {
    appName: row.appName,
    accentHue: row.accentHue,
    companyName: row.companyName,
    companyAddress: row.companyAddress,
    companyPhone: row.companyPhone,
    companyEmail: row.companyEmail,
    companyWebsite: row.companyWebsite,
    companyRegistrationNumber: row.companyRegistrationNumber,
    logoImage: row.logoImage,
    hasCustomPassword: false,
  };
}

export const systemPublicRouter: IRouter = Router();

systemPublicRouter.get("/system/settings", async (_req, res) => {
  const row = await readSettings();
  res.json(publicShape(row));
});

export const systemProtectedRouter: IRouter = Router();

systemProtectedRouter.patch(
  "/system/settings",
  requireAuth,
  requirePermission("settings.admin"),
  async (req, res): Promise<void> => {
    const parsed = UpdateSystemSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const data = parsed.data;
    const logoErr = validateImageDataUrl(data.logoImage, "logoImage");
    if (logoErr) {
      res.status(400).json({ error: logoErr });
      return;
    }

    const trimOrNull = (v: string | null | undefined) =>
      v === undefined ? undefined : v === null ? null : v.trim() || null;

    const patch: Record<string, unknown> = {};
    if (data.appName !== undefined) patch.appName = data.appName.trim();
    if (data.accentHue !== undefined) patch.accentHue = data.accentHue;
    if (data.companyName !== undefined) patch.companyName = trimOrNull(data.companyName);
    if (data.companyAddress !== undefined) patch.companyAddress = trimOrNull(data.companyAddress);
    if (data.companyPhone !== undefined) patch.companyPhone = trimOrNull(data.companyPhone);
    if (data.companyEmail !== undefined) patch.companyEmail = trimOrNull(data.companyEmail);
    if (data.companyWebsite !== undefined) patch.companyWebsite = trimOrNull(data.companyWebsite);
    if (data.companyRegistrationNumber !== undefined)
      patch.companyRegistrationNumber = trimOrNull(data.companyRegistrationNumber);
    if (data.logoImage !== undefined) patch.logoImage = data.logoImage ?? null;

    await readSettings();

    if (Object.keys(patch).length === 0) {
      const row = await readSettings();
      res.json(publicShape(row));
      return;
    }

    const updated = await db
      .update(appSettingsTable)
      .set(patch)
      .where(eq(appSettingsTable.id, 1))
      .returning();
    res.json(publicShape(updated[0]));
  },
);

export default systemPublicRouter;
