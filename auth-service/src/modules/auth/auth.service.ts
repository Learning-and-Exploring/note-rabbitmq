import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../../shared/database";
import {
  CreateAuthDto,
  LoginAuthDto,
  LogoutDto,
  RefreshTokenDto,
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

const SALT_ROUNDS = 10;
const EMAIL_VERIFY_TTL_HOURS = 24;

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
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
    const verificationToken = generateVerificationToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000,
    );

    const auth = await prisma.auth.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        emailVerificationTokenHash: verificationTokenHash,
        emailVerificationExpiresAt: verificationExpiresAt,
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

    // 🐇 Publish after successful DB write (fire-and-forget)
    publishAuthCreated({
      id: auth.id,
      email: auth.email,
      name: auth.name,
      createdAt: auth.createdAt.toISOString(),
      emailVerified: false,
    });

    return {
      ...auth,
      verificationToken,
      verificationExpiresAt,
    };
  },

  /**
   * Verify email by token and emit auth.email_verified.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = hashToken(dto.token);
    const now = new Date();

    const auth = await prisma.auth.findFirst({
      where: {
        emailVerificationTokenHash: tokenHash,
      },
      select: {
        id: true,
        email: true,
        emailVerificationExpiresAt: true,
        emailVerifiedAt: true,
      },
    });

    if (!auth) {
      throw new Error("Invalid verification token.");
    }

    if (!auth.emailVerificationExpiresAt || auth.emailVerificationExpiresAt < now) {
      throw new Error("Verification token has expired.");
    }

    if (auth.emailVerifiedAt) {
      return {
        id: auth.id,
        email: auth.email,
        emailVerifiedAt: auth.emailVerifiedAt,
      };
    }

    const updated = await prisma.auth.update({
      where: { id: auth.id },
      data: {
        emailVerifiedAt: now,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
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

    // if (!auth.emailVerifiedAt) {
    //   throw new Error("Email is not verified. Please verify your email first.");
    // }

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
