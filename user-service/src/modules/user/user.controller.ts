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
      const limit = Math.max(0, Number(req.query.limit) || 10);
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
    }catch (error: any) {
      if (error.message === "User not found.") {
        res.status(404).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  }
};
