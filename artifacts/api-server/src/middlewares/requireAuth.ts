import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Gate a route behind a signed-in Clerk user. On success the authenticated
 * Clerk user id is attached to `req.userId` so handlers can scope every query
 * to the owning user. The web app authenticates via Clerk's session cookie, so
 * no Authorization header handling is needed here.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId =
    (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}
