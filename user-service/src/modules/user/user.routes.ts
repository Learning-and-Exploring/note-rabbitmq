import { Router } from "express";
import { userController } from "./user.controller";

const router = Router();

// GET /users?page=1&limit=10 — list users with pagination
router.get("/", userController.getAllUsers);

// POST /users — create user from admin dashboard
router.post("/", userController.createUser);

// GET /users/summary — dashboard summary values
router.get("/summary", userController.getSummary);

// GET /users/workspace-settings — read workspace settings
router.get("/workspace-settings", userController.getWorkspaceSettings);

// PUT /users/workspace-settings — update workspace settings
router.put("/workspace-settings", userController.updateWorkspaceSettings);

// GET /users/:id — get a single user by ID
router.get("/:id", userController.getUserById);

// DELETE /users/:id — delete a single user by ID
router.delete("/:id", userController.deleteUser);

export default router;
