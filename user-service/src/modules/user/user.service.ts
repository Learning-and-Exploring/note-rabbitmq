import { prisma } from "../../shared/database";
import { CreateUserDto } from "./user.model";
import { publishUserCreated } from "../../events/publishers/user.publisher";

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
      },
      select: {
        id: true,
        email: true,
        name: true,
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
   * Return all users (safe fields only).
   */
  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
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
