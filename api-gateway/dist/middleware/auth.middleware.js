"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const token_1 = require("../shared/token");
function getPathWithoutQuery(originalUrl) {
    const idx = originalUrl.indexOf("?");
    return idx === -1 ? originalUrl : originalUrl.slice(0, idx);
}
function isPublicAuthRoute(req) {
    const path = getPathWithoutQuery(req.originalUrl);
    if (req.method === "POST" && path === "/auths")
        return true;
    if (req.method === "POST" && path === "/auths/login")
        return true;
    if (req.method === "POST" && path === "/auths/refresh")
        return true;
    if (req.method === "POST" && path === "/auths/logout")
        return true;
    if (req.method === "POST" && path === "/auths/verify-email")
        return true;
    if (req.method === "POST" && path === "/auths/resend-otp")
        return true;
    if (req.method === "GET" && path === "/auths/health")
        return true;
    return false;
}
function isAdminOnlyRoute(req) {
    const path = getPathWithoutQuery(req.originalUrl);
    if (path === "/users" || path.startsWith("/users/")) {
        return true;
    }
    if (req.method === "GET" && path === "/auths") {
        return true;
    }
    if (req.method === "PATCH" && /^\/auths\/[^/]+\/verify-email$/.test(path)) {
        return true;
    }
    if (req.method === "PATCH" && /^\/auths\/[^/]+\/email-verification$/.test(path)) {
        return true;
    }
    return false;
}
function getAuthIdParam(path) {
    const changeNameMatch = path.match(/^\/auths\/change-name\/([^/]+)$/);
    if (changeNameMatch?.[1])
        return changeNameMatch[1];
    const authByIdMatch = path.match(/^\/auths\/([^/]+)$/);
    if (authByIdMatch?.[1])
        return authByIdMatch[1];
    return null;
}
/**
 * Verifies Bearer access token for protected routes.
 */
function authMiddleware(req, res, next) {
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
        const payload = (0, token_1.verifyAccessToken)(token);
        const path = getPathWithoutQuery(req.originalUrl);
        if (isAdminOnlyRoute(req) && payload.role !== "ADMIN") {
            res.status(403).json({ message: "Admin access required." });
            return;
        }
        const authIdInPath = getAuthIdParam(path);
        const isAuthGetById = req.method === "GET" && /^\/auths\/[^/]+$/.test(path);
        const isAuthChangeNameById = req.method === "PATCH" && /^\/auths\/change-name\/[^/]+$/.test(path);
        if ((isAuthGetById || isAuthChangeNameById) && authIdInPath) {
            const isOwner = payload.sub === authIdInPath;
            const isAdmin = payload.role === "ADMIN";
            if (!isOwner && !isAdmin) {
                res.status(403).json({ message: "Forbidden: insufficient permissions." });
                return;
            }
        }
    }
    catch (_error) {
        res.status(401).json({ message: "Invalid or expired access token." });
        return;
    }
    next();
}
