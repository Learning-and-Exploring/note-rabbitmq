import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const router = Router();

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

/**
 * Proxy all /auths/* requests to auth-service.
 */
router.use(
  "/",
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    // Router is already mounted at /auths, so prepend it back for upstream.
    pathRewrite: (path) => `/auths${path}`,
    on: {
      error: (err, _req, res) => {
        console.error("[Gateway] auth-service proxy error:", err.message);
        (res as any).status(502).json({ message: "auth-service unavailable." });
      },
    },
  }),
);

export default router;
