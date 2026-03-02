"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const router = (0, express_1.Router)();
const NOTE_SERVICE_URL = process.env.NOTE_SERVICE_URL ?? "http://localhost:3003";
/**
 * Proxy all /public/notes/* requests to note-service public note endpoints.
 */
router.use("/", (0, http_proxy_middleware_1.createProxyMiddleware)({
    target: NOTE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/public/notes${path}`,
    on: {
        error: (err, _req, res) => {
            console.error("[Gateway] public note proxy error:", err.message);
            res.status(502).json({ message: "note-service unavailable." });
        },
    },
}));
exports.default = router;
