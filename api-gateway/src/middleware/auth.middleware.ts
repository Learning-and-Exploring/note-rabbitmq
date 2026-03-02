import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../shared/token";

function getPathWithoutQuery(originalUrl: string): string {
  const idx = originalUrl.indexOf("?");
  return idx === -1 ? originalUrl : originalUrl.slice(0, idx);
}

function isPublicAuthRoute(req: Request): boolean {
  const path = getPathWithoutQuery(req.originalUrl);
  if (req.method === "POST" && path === "/auths") return true;
  if (req.method === "POST" && path === "/auths/login") return true;
  if (req.method === "POST" && path === "/auths/refresh") return true;
  if (req.method === "POST" && path === "/auths/logout") return true;
  if (req.method === "POST" && path === "/auths/verify-email") return true;
  if (req.method === "POST" && path === "/auths/resend-otp") return true;
  if (req.method === "GET" && path === "/auths/health") return true;
  return false;
}

function isAdminOnlyRoute(req: Request): boolean {
  const path = getPathWithoutQuery(req.originalUrl);

  if (path === "/users" || path.startsWith("/users/")) {
    return true;
  }

  return false;
}

/**
 * Verifies Bearer access token for protected routes.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isPublicAuthRoute(req)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    res.status(401).json({ message: "Missing Bearer token." });
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    if (isAdminOnlyRoute(req) && payload.role !== "ADMIN") {
      res.status(403).json({ message: "Admin access required." });
      return;
    }
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired access token." });
    return;
  }

  next();
}
