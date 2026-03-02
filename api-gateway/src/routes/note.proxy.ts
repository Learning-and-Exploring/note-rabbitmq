import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const router = Router();

const NOTE_SERVICE_URL =
  process.env.NOTE_SERVICE_URL ?? "http://localhost:3003";

/**
 * Proxy all /notes/* requests to note-service.
 */
router.use(
  "/",
  createProxyMiddleware({
    target: NOTE_SERVICE_URL,
    changeOrigin: true,
    // Router is already mounted at /notes, so prepend it back for upstream.
    pathRewrite: (path) => `/notes${path}`,
    on: {
      error: (err, _req, res) => {
        console.error("[Gateway] note-service proxy error:", err.message);
        (res as any).status(502).json({ message: "note-service unavailable." });
      },
    },
  }),
);

export default router;
