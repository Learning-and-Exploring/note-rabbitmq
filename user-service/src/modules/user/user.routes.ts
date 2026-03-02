import { Router } from "express";
import { userController } from "./user.controller";

const router = Router();

// GET /users?page=1&limit=10 — list users with pagination
router.get("/", userController.getAllUsers);

// GET /users/:id — get a single user by ID
router.get("/:id", userController.getUserById);

// DELETE /users/:id — delete a single user by ID
router.delete("/:id", userController.deleteUser);

export default router;
