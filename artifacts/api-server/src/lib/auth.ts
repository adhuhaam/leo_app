import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
  permissions: string[];
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const supabaseUrl = process.env["SUPABASE_URL"];
const jwtSecret = process.env["SUPABASE_JWT_SECRET"];

const jwks = supabaseUrl
  ? createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`))
  : null;

const secretKey = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;

function parseClaims(payload: Record<string, unknown>): { sub: string; email?: string } {
  const sub = payload.sub;
  if (typeof sub !== "string" || !sub) throw new Error("JWT missing sub claim");
  return { sub, email: typeof payload.email === "string" ? payload.email : undefined };
}

export async function verifySupabaseJwt(token: string): Promise<{ sub: string; email?: string }> {
  if (jwks) {
    try {
      const { payload } = await jwtVerify(token, jwks);
      return parseClaims(payload as Record<string, unknown>);
    } catch (err) {
      if (!secretKey) throw err;
    }
  }

  if (secretKey) {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    return parseClaims(payload as Record<string, unknown>);
  }

  throw new Error("Configure SUPABASE_URL or SUPABASE_JWT_SECRET for JWT verification");
}

/** Extract Bearer token from Authorization header. */
export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

/**
 * Middleware: verify Supabase JWT and attach req.authClaims.
 * User profile is loaded separately by loadUserProfile.
 */
export async function authenticateJwt(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const claims = await verifySupabaseJwt(token);
    req.authClaims = claims;
    next();
  } catch (err) {
    req.log?.warn({ err }, "Invalid JWT");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

declare global {
  namespace Express {
    interface Request {
      authClaims?: { sub: string; email?: string };
    }
  }
}

/** Gate protected routes — requires req.user to be populated. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.user) {
    next();
    return;
  }
  res.status(401).json({ error: "Authentication required" });
}
