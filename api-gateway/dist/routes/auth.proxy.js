"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const router = (0, express_1.Router)();
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";
/**
 * Proxy all /auths/* requests to auth-service.
 */
router.use("/", (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    // Router is already mounted at /auths, so prepend it back for upstream.
    pathRewrite: (path) => `/auths${path}`,
    on: {
        error: (err, _req, res) => {
            console.error("[Gateway] auth-service proxy error:", err.message);
            res.status(502).json({ message: "auth-service unavailable." });
        },
    },
}));
exports.default = router;
