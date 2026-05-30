import { Router, type IRouter } from "express";
import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { timingSafeEqual } from "node:crypto";

const router: IRouter = Router();

function devAuthEnabled(): boolean {
  return process.env["DEV_AUTH"] === "true" && process.env["NODE_ENV"] !== "production";
}

async function verifyDevPassword(plain: string): Promise<boolean> {
  const expected = process.env["DEV_PASSWORD"] ?? "leo123";
  const a = Buffer.from(plain);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Local-only login for development without Supabase.
 * POST /dev/login { email, password }
 * Returns { access_token, user: { id, email } }
 */
router.post("/dev/login", async (req, res): Promise<void> => {
  if (!devAuthEnabled()) {
    res.status(404).json({ error: "Dev auth is disabled" });
    return;
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  if (!(await verifyDevPassword(password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user?.isActive) {
    res.status(401).json({
      error: "Unknown user. Run `pnpm dev:setup` to seed local dev accounts.",
    });
    return;
  }

  const secret = process.env["SUPABASE_JWT_SECRET"];
  if (!secret) {
    res.status(500).json({ error: "SUPABASE_JWT_SECRET is not configured" });
    return;
  }

  const token = await new SignJWT({ email: user.email, role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));

  res.json({
    access_token: token,
    user: { id: user.id, email: user.email },
  });
});

export default router;
