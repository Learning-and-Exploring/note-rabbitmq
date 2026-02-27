import { Request, Response, NextFunction } from "express";

/**
 * Minimal auth middleware stub.
 * In a real project this would verify a JWT and attach req.auth.
 * For now it just passes through all requests.
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // TODO: validate Bearer token, e.g.:
  // const token = req.headers.authorization?.split(" ")[1];
  // if (!token) return res.status(401).json({ message: "Unauthorized" });
  next();
}
