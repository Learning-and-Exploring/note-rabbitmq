import { prisma } from "../../shared/database";
import { CreateUserDto } from "./user.model";
import {
  publishUserCreated,
  publishUserEmailVerified,
} from "../../events/publishers/user.publisher";

export const userService = {
  /**
   * Sync local user profile from auth.created event payload.
   * Publishes user.created only the first time a user is created.
   */
  async syncFromAuthCreated(dto: CreateUserDto) {
    const existing = await prisma.user.findUnique({
      where: { id: dto.id },
      select: { id: true },
    });

    const user = await prisma.user.upsert({
      where: { id: dto.id },
      update: {
        email: dto.email,
        name: dto.name,
      },
      create: {
        id: dto.id,
        email: dto.email,
        name: dto.name,
        isEmailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!existing) {
      publishUserCreated({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      });
    }

    return user;
  },

  /**
   * Sync email verification status from auth.email_verified payload.
   * Publishes user.email_verified only when transitioning to verified.
   */
  async syncEmailVerifiedFromAuth(data: {
    id: string;
    email: string;
    verifiedAt: string;
  }) {
    const verifiedAt = new Date(data.verifiedAt);
    const existing = await prisma.user.findUnique({
      where: { id: data.id },
      select: { id: true, isEmailVerified: true },
    });

    const user = await prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data.email,
        isEmailVerified: true,
        emailVerifiedAt: verifiedAt,
      },
      create: {
        id: data.id,
        email: data.email,
        isEmailVerified: true,
        emailVerifiedAt: verifiedAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!existing?.isEmailVerified) {
      publishUserEmailVerified({
        id: user.id,
        email: user.email,
        verifiedAt: (user.emailVerifiedAt ?? verifiedAt).toISOString(),
      });
    }

    return user;
  },

  /**
   * Return all users (safe fields only).
   */
  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Return a single user by ID.
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

    return user;
  },
};
