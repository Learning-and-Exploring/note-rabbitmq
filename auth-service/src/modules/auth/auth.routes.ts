import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

// POST /auths  — create a new auth
router.post("/", authController.createAuth);

// GET /auths   — list all auths
router.get("/", authController.getAllAuths);

// POST /auths/verify-email — verify email by token
router.post("/verify-email", authController.verifyEmail);

// GET /auths/:id — get a single auth by ID
router.get("/:id", authController.getAuthById);

export default router;
