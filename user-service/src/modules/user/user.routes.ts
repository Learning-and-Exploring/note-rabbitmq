import { Router } from "express";
import { userController } from "./user.controller";

const router = Router();

// POST /users  — create a new user
router.post("/", userController.createUser);

// GET /users   — list all users
router.get("/", userController.getAllUsers);

// GET /users/:id — get a single user by ID
router.get("/:id", userController.getUserById);

export default router;
