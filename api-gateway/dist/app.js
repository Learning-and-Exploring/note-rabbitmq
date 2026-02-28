"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const auth_proxy_1 = __importDefault(require("./routes/auth.proxy"));
const user_proxy_1 = __importDefault(require("./routes/user.proxy"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 3000;
app.use(express_1.default.json());
// ── Health check (no auth required) ─────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "api-gateway" });
});
// ── Protected routes ─────────────────────────────────────────────────────────
app.use("/auths", auth_middleware_1.authMiddleware, auth_proxy_1.default);
app.use("/users", auth_middleware_1.authMiddleware, user_proxy_1.default);
// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ message: "Route not found." });
});
app.listen(PORT, () => {
    console.log(`[api-gateway] Running on http://localhost:${PORT}`);
});
exports.default = app;
