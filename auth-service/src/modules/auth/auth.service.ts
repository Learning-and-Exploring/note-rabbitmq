import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../../shared/database";
import {
  CreateAuthDto,
  LoginAuthDto,
  LogoutDto,
  RefreshTokenDto,
  ResendEmailOtpDto,
  VerifyEmailDto,
} from "./auth.model";
import {
  publishAuthCreated,
  publishAuthEmailVerified,
} from "../../events/publishers/auth.publisher";
import {
  createAccessToken,
  createRefreshToken,
  getAccessTokenTtlSeconds,
  getRefreshTokenExpiryDate,
  hashRefreshToken,
} from "../../shared/token";
import { sendVerificationOtpEmail } from "../../shared/smtp";
import { env } from "../../config/env";

const SALT_ROUNDS = 10;
const DEFAULT_EMAIL_OTP_TTL_MINUTES = 5;
const DEFAULT_EMAIL_OTP_MAX_ATTEMPTS = 5;
const DEFAULT_EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60;

function readPositiveInt(raw: string, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getEmailOtpTtlMinutes(): number {
  return readPositiveInt(env.EMAIL_OTP_TTL_MINUTES, DEFAULT_EMAIL_OTP_TTL_MINUTES);
}

function getEmailOtpMaxAttempts(): number {
  return readPositiveInt(env.EMAIL_OTP_MAX_ATTEMPTS, DEFAULT_EMAIL_OTP_MAX_ATTEMPTS);
}

function getEmailOtpResendCooldownSeconds(): number {
  return readPositiveInt(
    env.EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
    DEFAULT_EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  );
}

function generateOtpCode(): string {
  const code = crypto.randomInt(0, 1_000_000);
  return code.toString().padStart(6, "0");
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function getOtpExpiryDate(): Date {
  return new Date(Date.now() + getEmailOtpTtlMinutes() * 60 * 1000);
}

export const authService = {
  /**
   * Create a new auth, persist to DB, then publish a RabbitMQ event.
   */
  async createAuth(dto: CreateAuthDto) {
    const existing = await prisma.auth.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new Error("A auth with that email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const otp = generateOtpCode();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = getOtpExpiryDate();
    const otpSentAt = new Date();

    const auth = await prisma.auth.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        emailVerificationOtpHash: otpHash,
        emailVerificationOtpExpiresAt: otpExpiresAt,
        emailVerificationOtpAttempts: 0,
        emailVerificationOtpSentAt: otpSentAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    try {
      await sendVerificationOtpEmail({
        to: auth.email,
        name: auth.name,
        otp,
        expiresInMinutes: getEmailOtpTtlMinutes(),
      });
    } catch (error) {
      await prisma.auth.delete({ where: { id: auth.id } });
      throw error;
    }

    // Publish after successful DB write + OTP dispatch.
    publishAuthCreated({
      id: auth.id,
      email: auth.email,
      name: auth.name,
      createdAt: auth.createdAt.toISOString(),
      emailVerified: false,
    });

    return {
      ...auth,
      verificationOtpSent: true,
      verificationOtpExpiresAt: otpExpiresAt,
    };
  },

  /**
   * Verify email by OTP and emit auth.email_verified.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const now = new Date();

    const auth = await prisma.auth.findUnique({
      where: {
        email: dto.email,
      },
      select: {
        id: true,
        email: true,
        emailVerificationOtpHash: true,
        emailVerificationOtpExpiresAt: true,
        emailVerificationOtpAttempts: true,
        emailVerifiedAt: true,
      },
    });

    if (!auth) {
      throw new Error("Invalid email or OTP.");
    }

    if (auth.emailVerifiedAt) {
      throw new Error("Email is already verified.");
    }

    if (auth.emailVerificationOtpAttempts >= getEmailOtpMaxAttempts()) {
      throw new Error("Too many OTP attempts. Please request a new OTP.");
    }

    if (
      !auth.emailVerificationOtpHash ||
      !auth.emailVerificationOtpExpiresAt ||
      auth.emailVerificationOtpExpiresAt < now
    ) {
      throw new Error("Verification OTP has expired.");
    }

    const incomingOtpHash = hashOtp(dto.otp);
    if (incomingOtpHash !== auth.emailVerificationOtpHash) {
      await prisma.auth.update({
        where: { id: auth.id },
        data: {
          emailVerificationOtpAttempts: {
            increment: 1,
          },
        },
      });
      throw new Error("Invalid email or OTP.");
    }

    const updated = await prisma.auth.update({
      where: { id: auth.id },
      data: {
        emailVerifiedAt: now,
        emailVerificationOtpHash: null,
        emailVerificationOtpExpiresAt: null,
        emailVerificationOtpAttempts: 0,
        emailVerificationOtpSentAt: null,
      },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
      },
    });

    publishAuthEmailVerified({
      id: updated.id,
      email: updated.email,
      verifiedAt: updated.emailVerifiedAt!.toISOString(),
    });

    return updated;
  },

  /**
   * Resend verification OTP.
   */
  async resendVerificationOtp(dto: ResendEmailOtpDto) {
    const now = new Date();
    const auth = await prisma.auth.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        emailVerificationOtpSentAt: true,
      },
    });

    // Do not reveal whether email exists.
    if (!auth) {
      return { sent: true };
    }

    if (auth.emailVerifiedAt) {
      throw new Error("Email is already verified.");
    }

    const cooldownMs = getEmailOtpResendCooldownSeconds() * 1000;
    if (
      auth.emailVerificationOtpSentAt &&
      now.getTime() - auth.emailVerificationOtpSentAt.getTime() < cooldownMs
    ) {
      throw new Error("Please wait before requesting another OTP.");
    }

    const otp = generateOtpCode();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = getOtpExpiryDate();

    await sendVerificationOtpEmail({
      to: auth.email,
      name: auth.name,
      otp,
      expiresInMinutes: getEmailOtpTtlMinutes(),
    });

    await prisma.auth.update({
      where: { id: auth.id },
      data: {
        emailVerificationOtpHash: otpHash,
        emailVerificationOtpExpiresAt: otpExpiresAt,
        emailVerificationOtpAttempts: 0,
        emailVerificationOtpSentAt: now,
      },
    });

    return { sent: true };
  },

  /**
   * Login with email and password.
   */
  async login(dto: LoginAuthDto) {
    const auth = await prisma.auth.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!auth) {
      throw new Error("Invalid email or password.");
    }

    const passwordMatch = await bcrypt.compare(dto.password, auth.passwordHash);
    if (!passwordMatch) {
      throw new Error("Invalid email or password.");
    }

    if (!auth.emailVerifiedAt) {
      throw new Error("Email is not verified. Please verify your email first.");
    }

    const refreshToken = createRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const refreshTokenExpiresAt = getRefreshTokenExpiryDate();

    await prisma.auth.update({
      where: { id: auth.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });

    const accessToken = createAccessToken({
      sub: auth.id,
      email: auth.email,
      name: auth.name,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: getAccessTokenTtlSeconds(),
      data: {
        id: auth.id,
        email: auth.email,
        name: auth.name,
        emailVerifiedAt: auth.emailVerifiedAt,
        createdAt: auth.createdAt,
        updatedAt: auth.updatedAt,
      },
    };
  },

  /**
   * Refresh access token using a valid refresh token.
   */
  async refreshToken(dto: RefreshTokenDto) {
    const refreshTokenHash = hashRefreshToken(dto.refreshToken);
    const now = new Date();

    const auth = await prisma.auth.findFirst({
      where: { refreshTokenHash },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        refreshTokenExpiresAt: true,
      },
    });

    if (!auth) {
      throw new Error("Invalid refresh token.");
    }

    if (!auth.refreshTokenExpiresAt || auth.refreshTokenExpiresAt < now) {
      throw new Error("Refresh token has expired.");
    }

    const newRefreshToken = createRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const newRefreshTokenExpiresAt = getRefreshTokenExpiryDate();

    await prisma.auth.update({
      where: { id: auth.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
      },
    });

    const accessToken = createAccessToken({
      sub: auth.id,
      email: auth.email,
      name: auth.name,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: getAccessTokenTtlSeconds(),
      data: {
        id: auth.id,
        email: auth.email,
        name: auth.name,
        emailVerifiedAt: auth.emailVerifiedAt,
      },
    };
  },

  /**
   * Revoke refresh token (logout).
   */
  async logout(dto: LogoutDto) {
    const refreshTokenHash = hashRefreshToken(dto.refreshToken);
    const auth = await prisma.auth.findFirst({
      where: { refreshTokenHash },
      select: { id: true },
    });

    if (!auth) {
      return { revoked: false };
    }

    await prisma.auth.update({
      where: { id: auth.id },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });

    return { revoked: true };
  },

  /**
   * Return all auths (safe fields only).
   */
  async getAllAuths() {
    return prisma.auth.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Return a single auth by ID.
   */
  async getAuthById(id: string) {
    const auth = await prisma.auth.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!auth) {
      throw new Error("Auth not found.");
    }

    return auth;
  },
};
