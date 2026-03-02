import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

// POST /auths  — create a new auth
router.post("/", authController.createAuth);

// POST /auths/login — login with email + password
router.post("/login", authController.login);

// POST /auths/refresh — refresh access token
router.post("/refresh", authController.refreshToken);

// POST /auths/logout — revoke refresh token
router.post("/logout", authController.logout);

// GET /auths   — list all auths
router.get("/", authController.getAllAuths);

// POST /auths/verify-email — verify email by OTP
router.post("/verify-email", authController.verifyEmail);

// POST /auths/resend-otp — resend email verification OTP
router.post("/resend-otp", authController.resendVerificationOtp);

// GET /auths/:id — get a single auth by ID
router.get("/:id", authController.getAuthById);

export default router;
