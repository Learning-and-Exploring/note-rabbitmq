import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../../shared/database";
import { CreateAuthDto, VerifyEmailDto } from "./auth.model";
import {
  publishAuthCreated,
  publishAuthEmailVerified,
} from "../../events/publishers/auth.publisher";

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
