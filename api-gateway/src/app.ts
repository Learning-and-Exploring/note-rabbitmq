import express, { Request, Response } from "express";
import { authMiddleware } from "./middleware/auth.middleware";
import authProxy from "./routes/auth.proxy";
import userProxy from "./routes/user.proxy";

const app = express();
const PORT = process.env.PORT ?? 3000;

// ── Health check (no auth required) ─────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// ── Protected routes ─────────────────────────────────────────────────────────
app.use("/auths", authMiddleware, authProxy);
app.use("/users", authMiddleware, userProxy);

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`[api-gateway] Running on http://localhost:${PORT}`);
});

export default app;
