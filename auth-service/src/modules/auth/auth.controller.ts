import { Request, Response } from "express";
import { authService } from "./auth.service";

export const authController = {
  /**
   * POST /auths
   * Create a new auth.
   * Body: { email, password, name? }
   */
  async createAuth(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: "email and password are required." });
        return;
      }

      const auth = await authService.createAuth({ email, password, name });
      res
        .status(201)
        .json({ message: "Auth created successfully.", data: auth });
    } catch (error: any) {
      if (error.message === "A auth with that email already exists.") {
        res.status(409).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },

  /**
   * GET /auths
   * Return all auths.
   */
  async getAllAuths(_req: Request, res: Response) {
    try {
      const auths = await authService.getAllAuths();
      res.status(200).json({ data: auths });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error.", detail: error.message });
    }
  },

  /**
   * GET /auths/:id
   * Return a single auth by ID.
   */
  async getAuthById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const auth = await authService.getAuthById(id as string);
      res.status(200).json({ data: auth });
    } catch (error: any) {
      if (error.message === "Auth not found.") {
        res.status(404).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },
};
