import { Request, Response } from "express";
import { authService } from "./auth.service";

const REFRESH_COOKIE_NAME = "refreshToken";

function parseCookies(rawCookieHeader?: string): Record<string, string> {
  if (!rawCookieHeader) return {};

  return rawCookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rawValue.join("=") || "");
    return acc;
  }, {});
}

function readRefreshTokenFromCookie(req: Request): string {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[REFRESH_COOKIE_NAME] || "";
}

function getRefreshCookieOptions() {
  const rawDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? "7");
  const refreshDays = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 7;

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(refreshDays * 24 * 60 * 60 * 1000),
  };
}

function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
}

function clearRefreshTokenCookie(res: Response): void {
  const options = getRefreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
}

export const authController = {
  /**
   * POST /auths
   * Create a new auth.
   * Body: { email, password, name? }
   */
  async createAuth(req: Request, res: Response) {
    try {
      const { email, password, name, role } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: "email and password are required." });
        return;
      }

      const auth = await authService.createAuth({ email, password, name, role });
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
   * PATCH /auths/change-name/:id
   */
  async updateNameById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        res.status(400).json({ message: "name is required." });
        return;
      }

      const auth = await authService.updateNameById(id as string, name);
      res.status(200).json({ message: "Name updated successfully.", data: auth });
    }
    catch (error: any) {
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
      setRefreshTokenCookie(res, auth.refreshToken);

      const { refreshToken: _refreshToken, ...dataWithoutRefresh } = auth;
      res.status(200).json({ message: "Login successful.", data: dataWithoutRefresh });
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
      const { refreshToken: bodyRefreshToken } = req.body ?? {};
      const cookieRefreshToken = readRefreshTokenFromCookie(req);
      const refreshToken = bodyRefreshToken || cookieRefreshToken;

      if (!refreshToken) {
        res.status(400).json({ message: "refreshToken is required." });
        return;
      }

      const tokenBundle = await authService.refreshToken({ refreshToken });
      setRefreshTokenCookie(res, tokenBundle.refreshToken);

      const { refreshToken: _refreshToken, ...dataWithoutRefresh } = tokenBundle;
      res.status(200).json({
        message: "Token refreshed successfully.",
        data: dataWithoutRefresh,
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
      const { refreshToken: bodyRefreshToken } = req.body ?? {};
      const cookieRefreshToken = readRefreshTokenFromCookie(req);
      const refreshToken = bodyRefreshToken || cookieRefreshToken;

      const result = refreshToken
        ? await authService.logout({ refreshToken })
        : { revoked: false };

      clearRefreshTokenCookie(res);
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

  /**
   * PATCH /auths/:id/verify-email
   * Admin endpoint to force-verify email.
   */
  async adminVerifyEmailById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await authService.adminVerifyEmailById(id as string);

      res.status(200).json({
        message: result.alreadyVerified
          ? "Email is already verified."
          : "Email verified successfully by admin.",
        data: result,
      });
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
   * PATCH /auths/:id/email-verification
   * Admin endpoint to set email verification true/false.
   * Body: { isEmailVerified: boolean }
   */
  async adminSetEmailVerificationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isEmailVerified } = req.body ?? {};

      if (typeof isEmailVerified !== "boolean") {
        res.status(400).json({ message: "isEmailVerified (boolean) is required." });
        return;
      }

      const result = await authService.adminSetEmailVerificationById(
        id as string,
        isEmailVerified,
      );

      res.status(200).json({
        message: result.changed
          ? `Email verification set to ${isEmailVerified}.`
          : "Email verification state unchanged.",
        data: result,
      });
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
