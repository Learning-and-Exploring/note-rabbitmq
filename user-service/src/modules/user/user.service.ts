import { prisma } from "../../shared/database";
import { Prisma } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import {
  AdminCreateUserDto,
  CreateUserDto,
  WorkspaceSettingsDto,
} from "./user.model";
import {
  publishUserCreated,
  publishUserEmailVerified,
} from "../../events/publishers/user.publisher";
import { env } from "../../config/env";

const defaultWorkspaceSettings: WorkspaceSettingsDto = {
  name: "",
  updatedAt: new Date().toISOString(),
};
const workspaceSettingsPath = path.resolve(
  process.cwd(),
  "data",
  "workspace-settings.json",
);

async function readWorkspaceSettings(): Promise<WorkspaceSettingsDto> {
  try {
    const raw = await fs.readFile(workspaceSettingsPath, "utf-8");
    const parsed = JSON.parse(raw);

    const name = String(parsed?.name || "").trim();
    const updatedAt = String(parsed?.updatedAt || "").trim();
    if (!name || !updatedAt) {
      return { ...defaultWorkspaceSettings };
    }

    return { name, updatedAt };
  } catch {
    return { ...defaultWorkspaceSettings };
  }
}

async function writeWorkspaceSettings(
  settings: WorkspaceSettingsDto,
): Promise<void> {
  const dir = path.dirname(workspaceSettingsPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    workspaceSettingsPath,
    JSON.stringify(settings, null, 2),
    "utf-8",
  );
}

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
        role: dto.role,
      },
      create: {
        id: dto.id,
        email: dto.email,
        name: dto.name,
        role: dto.role ?? "USER",
        isEmailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
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
        role: true,
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
   * Sync email unverified status from auth.email_unverified payload.
   */
  async syncEmailUnverifiedFromAuth(data: {
    id: string;
    email: string;
  }) {
    const user = await prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data.email,
        isEmailVerified: false,
        emailVerifiedAt: null,
      },
      create: {
        id: data.id,
        email: data.email,
        isEmailVerified: false,
        emailVerifiedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isEmailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },

  /**
   * Return all users (safe fields only).
   */
  async getAllUsers(input: { page: number; limit: number; skip: number }) {
    const [total, users] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.findMany({
        skip: input.skip,
        take: input.limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isEmailVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { total, users };
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
        role: true,
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

  async deleteUser(id: string) {
    try {
      await prisma.user.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new Error("User not found.");
      }
      throw error;
    }
  },

  async createUserByAdmin(dto: AdminCreateUserDto) {
    const email = String(dto.email || "").trim().toLowerCase();
    const password = String(dto.password || "").trim();
    const name = String(dto.name || "").trim() || null;
    const role = dto.role === "ADMIN" ? "ADMIN" : "USER";

    if (!email || !email.includes("@")) {
      throw new Error("Valid email is required.");
    }
    if (!password) {
      throw new Error("Password is required.");
    }
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new Error("A user with this email already exists.");
    }

    const authServiceBaseUrl = env.AUTH_SERVICE_URL.replace(/\/+$/, "");
    let createdAuth: any = null;

    try {
      const authRes = await fetch(`${authServiceBaseUrl}/auths`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
          role,
        }),
      });

      const authPayloadRaw: unknown = await authRes.json().catch(() => ({}));
      const authPayload = (
        authPayloadRaw && typeof authPayloadRaw === "object"
          ? authPayloadRaw
          : {}
      ) as { message?: string; data?: unknown };
      if (!authRes.ok) {
        const message = String(authPayload?.message || "").trim();
        if (message === "A auth with that email already exists.") {
          throw new Error("A user with this email already exists.");
        }
        throw new Error(message || "Unable to create auth account.");
      }

      createdAuth = authPayload?.data || null;
    } catch (error: any) {
      if (
        error instanceof Error &&
        (error.message === "A user with this email already exists." ||
          error.message === "Unable to create auth account.")
      ) {
        throw error;
      }
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to create auth account.";
      throw new Error(message);
    }

    const authId = String(createdAuth?.id || "").trim();
    if (!authId) {
      throw new Error("Unable to create auth account.");
    }

    const isEmailVerified = Boolean(createdAuth?.emailVerifiedAt);
    const emailVerifiedAt = createdAuth?.emailVerifiedAt
      ? new Date(createdAuth.emailVerifiedAt)
      : null;

    try {
      const user = await prisma.user.upsert({
        where: { id: authId },
        update: {
          email,
          name,
          role,
          isEmailVerified,
          emailVerifiedAt,
        },
        create: {
          id: authId,
          email,
          name,
          role,
          isEmailVerified,
          emailVerifiedAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          isEmailVerified: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new Error("A user with this email already exists.");
      }
      throw error;
    }
  },

  async getWorkspaceSettings() {
    return readWorkspaceSettings();
  },

  async updateWorkspaceSettings(nameInput: string) {
    const name = String(nameInput || "").trim();
    if (!name) {
      throw new Error("Workspace name is required.");
    }
    if (name.length > 80) {
      throw new Error("Workspace name must be 80 characters or fewer.");
    }

    const settings: WorkspaceSettingsDto = {
      name,
      updatedAt: new Date().toISOString(),
    };
    await writeWorkspaceSettings(settings);
    return settings;
  },

  async getSummary() {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    const totalMembers = users.length;
    const activePages = users.filter((u) => u.updatedAt >= sevenDaysAgo).length;

    const storageBytes = users.reduce((total, user) => {
      const emailBytes = Buffer.byteLength(user.email || "", "utf-8");
      const nameBytes = Buffer.byteLength(user.name || "", "utf-8");
      const avatarBytes = Buffer.byteLength(user.avatarUrl || "", "utf-8");
      return total + emailBytes + nameBytes + avatarBytes;
    }, 0);

    const storageUsedGb = Number((storageBytes / (1024 ** 3)).toFixed(4));
    const storageLimitGb = Math.max(
      1,
      Number(process.env.WORKSPACE_STORAGE_LIMIT_GB || 50),
    );

    return {
      totalMembers,
      activePages,
      storageUsedGb,
      storageLimitGb,
      storagePercent: Math.min(
        100,
        Math.round((storageUsedGb / storageLimitGb) * 100),
      ),
    };
  },
};
