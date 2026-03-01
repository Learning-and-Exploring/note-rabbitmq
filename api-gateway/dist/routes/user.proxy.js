"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const router = (0, express_1.Router)();
const USER_SERVICE_URL = process.env.USER_SERVICE_URL ?? "http://localhost:3002";
/**
 * Proxy all /users/* requests to user-service.
 */
router.use("/", (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/users": "/users" },
    on: {
        error: (err, _req, res) => {
            console.error("[Gateway] user-service proxy error:", err.message);
            res.status(502).json({ message: "user-service unavailable." });
        },
    },
}));
exports.default = router;
