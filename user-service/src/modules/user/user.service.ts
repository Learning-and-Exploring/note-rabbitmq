import bcrypt from "bcryptjs";
import { prisma } from "../../shared/database";
import { CreateUserDto } from "./user.model";
import { publishUserCreated } from "../../events/publishers/user.publisher";

const SALT_ROUNDS = 10;

export const userService = {
  /**
   * Create a new user, persist to DB, then publish a RabbitMQ event.
   */
  async createUser(dto: CreateUserDto) {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new Error("A user with that email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
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

    // 🐇 Publish after successful DB write (fire-and-forget)
    publishUserCreated({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    });

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
