import express, { Application, Request, Response, NextFunction } from "express";
import paginate from "express-paginate";
import userRoutes from "./modules/user/user.routes";
import { requireAdminMiddleware } from "./middleware/admin.middleware";

const app: Application = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(paginate.middleware(10, 100));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/users", requireAdminMiddleware, userRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "user-service" });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found." });
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err.message);
  res.status(500).json({ message: "Unexpected error.", detail: err.message });
});

export default app;
