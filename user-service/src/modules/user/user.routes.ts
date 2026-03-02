import { Router } from "express";
import { userController } from "./user.controller";

const router = Router();

// GET /users   — list all users
router.get("/", userController.getAllUsers);

// GET /users/:id — get a single user by ID
router.get("/:id", userController.getUserById);

// DELETE /users/:id — delete a single user by ID
router.delete("/:id", userController.deleteUser);

export default router;
