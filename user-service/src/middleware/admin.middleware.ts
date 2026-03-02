import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../shared/token";

export function requireAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
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
    if (payload.role !== "ADMIN") {
      res.status(403).json({ message: "Admin access required." });
      return;
    }
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired access token." });
    return;
  }

  next();
}
