import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { LoginBody } from "@workspace/api-zod";

const APP_PASSWORD = process.env["APP_PASSWORD"];
if (!APP_PASSWORD) {
  throw new Error("APP_PASSWORD environment variable is required for authentication");
}

const router: IRouter = Router();

router.get("/auth/me", (req, res) => {
  res.json({ authenticated: Boolean(req.session?.authenticated) });
});

router.post("/auth/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  if (parsed.data.password !== APP_PASSWORD) {
    req.log.warn({ ip: req.ip }, "Failed login attempt");
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  // Regenerate the session ID on successful login to defeat session fixation:
  // any pre-existing SID an attacker may have planted is discarded and a fresh
  // one is issued before we mark the session as authenticated.
  req.session.regenerate((regenErr) => {
    if (regenErr) {
      req.log.error({ err: regenErr }, "Failed to regenerate session");
      res.status(500).json({ error: "Failed to log in" });
      return;
    }
    req.session.authenticated = true;
    req.session.save((saveErr) => {
      if (saveErr) {
        req.log.error({ err: saveErr }, "Failed to save session");
        res.status(500).json({ error: "Failed to log in" });
        return;
      }
      res.sendStatus(204);
    });
  });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Failed to destroy session");
    }
    res.clearCookie("leo.sid");
    res.sendStatus(204);
  });
});

/**
 * Middleware that gates protected API routes. Returns 401 (not 302) so the
 * SPA can decide where to redirect.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.authenticated) {
    next();
    return;
  }
  res.status(401).json({ error: "Authentication required" });
}

export default router;
