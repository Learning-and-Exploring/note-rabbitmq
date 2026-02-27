import { prisma } from "../../shared/database";
import { CreateUserDto } from "./user.model";

export const userService = {
  /**
   * Upsert local user profile from auth.created event payload.
   */
  async syncFromAuthCreated(dto: CreateUserDto) {
    return prisma.user.upsert({
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
