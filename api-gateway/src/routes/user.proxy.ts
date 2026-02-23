import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const router = Router();

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL ?? "http://localhost:3001";

/**
 * Proxy all /users/* requests to user-service.
 */
router.use(
  "/",
  createProxyMiddleware({
    target: USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^/users": "/users" },
    on: {
      error: (err, _req, res) => {
        console.error("[Gateway] user-service proxy error:", err.message);
        (res as any).status(502).json({ message: "user-service unavailable." });
      },
    },
  }),
);

export default router;
