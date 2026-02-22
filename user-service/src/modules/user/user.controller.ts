import { Request, Response } from "express";
import { userService } from "./user.service";

export const userController = {
  /**
   * POST /users
   * Create a new user.
   * Body: { email, password, name? }
   */
  async createUser(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: "email and password are required." });
        return;
      }

      const user = await userService.createUser({ email, password, name });
      res
        .status(201)
        .json({ message: "User created successfully.", data: user });
    } catch (error: any) {
      if (error.message === "A user with that email already exists.") {
        res.status(409).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },

  /**
   * GET /users
   * Return all users.
   */
  async getAllUsers(_req: Request, res: Response) {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json({ data: users });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error.", detail: error.message });
    }
  },

  /**
   * GET /users/:id
   * Return a single user by ID.
   */
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id as string);
      res.status(200).json({ data: user });
    } catch (error: any) {
      if (error.message === "User not found.") {
        res.status(404).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },
};
