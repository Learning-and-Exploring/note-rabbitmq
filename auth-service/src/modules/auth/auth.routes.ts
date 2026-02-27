import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

// POST /auths  — create a new auth
router.post("/", authController.createAuth);

// GET /auths   — list all auths
router.get("/", authController.getAllAuths);

// GET /auths/:id — get a single auth by ID
router.get("/:id", authController.getAuthById);

export default router;
