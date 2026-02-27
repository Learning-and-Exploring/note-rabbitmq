import bcrypt from "bcryptjs";
import { prisma } from "../../shared/database";
import { CreateAuthDto } from "./auth.model";
import { publishAuthCreated } from "../../events/publishers/auth.publisher";

const SALT_ROUNDS = 10;

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

    const auth = await prisma.auth.create({
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
    publishAuthCreated({
      id: auth.id,
      email: auth.email,
      name: auth.name,
      createdAt: auth.createdAt.toISOString(),
    });

    return auth;
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
