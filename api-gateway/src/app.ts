import express, { Request, Response } from "express";
import { authMiddleware } from "./middleware/auth.middleware";
import authProxy from "./routes/auth.proxy";
import noteProxy from "./routes/note.proxy";
import publicNoteProxy from "./routes/public-note.proxy";
import userProxy from "./routes/user.proxy";
import rateLimit from "express-rate-limit";
import { error } from "console";

const app = express();
const PORT = process.env.PORT ?? 3000;

// If behind nginx/reverse proxy:
app.set('trust proxy', 1)

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: "Too many requests, please try again later."}
})


app.use(globalLimiter);


// ── Health check (no auth required) ─────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "api-gateway" });
});

// ── Protected routes ─────────────────────────────────────────────────────────
app.use("/auths", authMiddleware, authProxy);
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
