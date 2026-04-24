import type { Request, Response, NextFunction } from "express";

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/logout",
  "/auth/me",
  "/healthz",
  "/bot/webhook",
];

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    next();
    return;
  }

  if (req.session.adminUsername) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}
