import { Request, Response } from "express";
import { userService } from "./user.service";

export const userController = {
  /**
   * GET /users
   * Return paginated users.
   * Query: ?page=1&limit=10
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Number(req.query.limit) || 10);
      const skip = (page - 1) * limit;
      const { users, total } = await userService.getAllUsers({ page, limit, skip });

      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);

      res.status(200).json({
        data: users,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
          hasPrevPage: safePage > 1,
          hasNextPage: safePage < totalPages,
          prevPage: safePage > 1 ? safePage - 1 : null,
          nextPage: safePage < totalPages ? safePage + 1 : null,
        },
      });
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

  /**
   * DELETE /users/:id
   * Delete a single user by ID.
   */
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id as string);
      res.status(204).end();
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

  /**
   * POST /users
   * Create a member profile from admin console.
   */
  async createUser(req: Request, res: Response) {
    try {
      const user = await userService.createUserByAdmin({
        email: req.body?.email,
        name: req.body?.name,
        role: req.body?.role,
      });

      res.status(201).json({ data: user });
    } catch (error: any) {
      if (
        error.message === "Valid email is required." ||
        error.message === "A user with this email already exists."
      ) {
        res.status(400).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },

  /**
   * GET /users/workspace-settings
   */
  async getWorkspaceSettings(_req: Request, res: Response) {
    try {
      const settings = await userService.getWorkspaceSettings();
      res.status(200).json({ data: settings });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error.", detail: error.message });
    }
  },

  /**
   * PUT /users/workspace-settings
   */
  async updateWorkspaceSettings(req: Request, res: Response) {
    try {
      const settings = await userService.updateWorkspaceSettings(req.body?.name);
      res.status(200).json({ data: settings });
    } catch (error: any) {
      if (
        error.message === "Workspace name is required." ||
        error.message === "Workspace name must be 80 characters or fewer."
      ) {
        res.status(400).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },

  /**
   * GET /users/summary
   */
  async getSummary(_req: Request, res: Response) {
    try {
      const summary = await userService.getSummary();
      res.status(200).json({ data: summary });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error.", detail: error.message });
    }
  },
};
