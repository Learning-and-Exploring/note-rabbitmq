"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
/**
 * Minimal auth middleware stub.
 * In a real project this would verify a JWT and attach req.auth.
 * For now it just passes through all requests.
 */
function authMiddleware(req, _res, next) {
    // TODO: validate Bearer token, e.g.:
    // const token = req.headers.authorization?.split(" ")[1];
    // if (!token) return res.status(401).json({ message: "Unauthorized" });
    next();
}
