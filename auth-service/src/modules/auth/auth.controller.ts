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
   * POST /auths/login
   * Login with email and password.
   * Body: { email, password }
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: "email and password are required." });
        return;
      }

      const auth = await authService.login({ email, password });
      res.status(200).json({ message: "Login successful.", data: auth });
    } catch (error: any) {
      if (error.message === "Invalid email or password.") {
        res.status(401).json({ message: error.message });
      } else if (
        error.message === "Email is not verified. Please verify your email first."
      ) {
        res.status(403).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },

  /**
   * POST /auths/refresh
   * Rotate refresh token and issue a new access token.
   * Body: { refreshToken }
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ message: "refreshToken is required." });
        return;
      }

      const tokenBundle = await authService.refreshToken({ refreshToken });
      res.status(200).json({
        message: "Token refreshed successfully.",
        data: tokenBundle,
      });
    } catch (error: any) {
      if (error.message === "Invalid refresh token.") {
        res.status(401).json({ message: error.message });
      } else if (error.message === "Refresh token has expired.") {
        res.status(401).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },

  /**
   * POST /auths/logout
   * Revoke refresh token.
   * Body: { refreshToken }
   */
  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ message: "refreshToken is required." });
        return;
      }

      const result = await authService.logout({ refreshToken });
      res.status(200).json({
        message: "Logout completed.",
        data: result,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error.", detail: error.message });
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

  /**
   * POST /auths/verify-email
   * Verify auth email using OTP sent to inbox.
   * Body: { email, otp }
   */
  async verifyEmail(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        res.status(400).json({ message: "email and otp are required." });
        return;
      }

      const result = await authService.verifyEmail({ email, otp });
      res.status(200).json({
        message: "Email verified successfully.",
        data: result,
      });
    } catch (error: any) {
      if (error.message === "Invalid email or OTP.") {
        res.status(400).json({ message: error.message });
      } else if (error.message === "Verification OTP has expired.") {
        res.status(410).json({ message: error.message });
      } else if (error.message === "Too many OTP attempts. Please request a new OTP.") {
        res.status(429).json({ message: error.message });
      } else if (error.message === "Email is already verified.") {
        res.status(409).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },

  /**
   * POST /auths/resend-otp
   * Resend OTP for email verification.
   * Body: { email }
   */
  async resendVerificationOtp(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ message: "email is required." });
        return;
      }

      const result = await authService.resendVerificationOtp({ email });
      res.status(200).json({
        message: "If the account exists, a new OTP has been sent.",
        data: result,
      });
    } catch (error: any) {
      if (
        error.message === "Please wait before requesting another OTP." ||
        error.message === "Too many OTP attempts. Please request a new OTP."
      ) {
        res.status(429).json({ message: error.message });
      } else if (error.message === "Email is already verified.") {
        res.status(409).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: error.message });
      }
    }
  },
};
