import express, { Request, Response } from "express";
import { authMiddleware } from "./middleware/auth.middleware";
import authProxy from "./routes/auth.proxy";
import noteProxy from "./routes/note.proxy";
import publicNoteProxy from "./routes/public-note.proxy";
import userProxy from "./routes/user.proxy";
import rateLimit from "express-rate-limit";
import { hostname } from "os";

const app = express();
const PORT = process.env.PORT ?? 3000;

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function resolveTrustProxy(): boolean | number | string {
  const raw = process.env.TRUST_PROXY;
  if (raw === undefined) return 1;
  if (raw === "true") return true;
  if (raw === "false") return false;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;
  return raw;
}

function shouldSkipRateLimit(req: Request): boolean {
  return req.method === "OPTIONS" || req.path === "/health";
}

app.set("trust proxy", resolveTrustProxy());

const globalWindowMs = readPositiveIntEnv("RATE_LIMIT_WINDOW_MS", 60 * 1000);
const globalMax = readPositiveIntEnv("RATE_LIMIT_MAX", 120);
const authWindowMs = readPositiveIntEnv("AUTH_RATE_LIMIT_WINDOW_MS", 10 * 60 * 1000);
const authMax = readPositiveIntEnv("AUTH_RATE_LIMIT_MAX", 20);

const globalLimiter = rateLimit({
  windowMs: globalWindowMs,
  max: globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests. Please try again later." });
  },
});

const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many auth requests. Please try again later." });
  },
});

app.use(globalLimiter);


// ── Health check (no auth required) ─────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "api-gateway", instance: hostname() });
});

// ── Protected routes ─────────────────────────────────────────────────────────
app.use("/auths", authLimiter, authMiddleware, authProxy);
app.use("/users", authMiddleware, userProxy);
app.use("/notes", authMiddleware, noteProxy);

// ── Public routes (no auth required) ────────────────────────────────────────
app.use("/public/notes", publicNoteProxy);

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found." });
});

app.listen(PORT, () => {
  console.log(`[api-gateway] Running on http://localhost:${PORT}`);
});

export default app;
