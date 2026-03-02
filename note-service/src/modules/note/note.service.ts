import { prisma } from "../../shared/database";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { CreateNoteDto } from "./note.model";

export const noteService = {
  /**
   * Create a note for a given auth.
   */
  async createNote(dto: CreateNoteDto) {
    return prisma.note.create({
      data: {
        authId: dto.authId,
        title: dto.title ?? "Untitled Note",
        content: dto.content,
      },
    });
  },

  /**
   * Get all notes (ordered newest first).
   */
  async getAllNotes() {
    return prisma.note.findMany({ orderBy: { createdAt: "desc" } });
  },

  /**
   * Get all notes belonging to a specific auth.
   */
  async getNotesByAuth(authId: string) {
    return prisma.note.findMany({
      where: { authId },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Get a single note by ID.
   */
  async getNoteById(id: string) {
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) throw new Error("Note not found.");
    return note;
  },

  /**
   * Delete a single note by ID
   */
  async deleteNoteById(id: string) {
    try {
      return await prisma.note.delete({ where: { id } });
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        throw new Error("Note not found.");
      }
      throw err;
    }
  },

  /**
   * Update a single note by ID
   */
  async updateNoteById(id: string, data: { title?: string; content?: string }) {
    try {
      return await prisma.note.update({
        where: { id },
        data,
      });
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        throw new Error("Note not found.");
      }
      throw err;
    }
  },

  async shareNoteById(id: string, authId: string) {
    const note = await prisma.note.findFirst({
      where: { id, authId },
      select: { id: true },
    });

    if (!note) {
      throw new Error("Note not found.");
    }

    const shareToken = crypto.randomBytes(24).toString("hex");
    return prisma.note.update({
      where: { id },
      data: {
        isPublic: true,
        shareToken,
      },
    });
  },

  async unshareNoteById(id: string, authId: string) {
    const note = await prisma.note.findFirst({
      where: { id, authId },
      select: { id: true },
    });

    if (!note) {
      throw new Error("Note not found.");
    }

    return prisma.note.update({
      where: { id },
      data: {
        isPublic: false,
        shareToken: null,
      },
    });
  },

  async getPublicNoteByToken(shareToken: string) {
    const note = await prisma.note.findFirst({
      where: {
        shareToken,
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
        updatedAt: true,
      },
    });

    if (!note) {
      throw new Error("Shared note not found.");
    }

    return note;
  },


  /**
   * Upsert a synced user (called by the RabbitMQ event handler).
   */
  async upsertSyncedUser(data: {
    id: string;
    email: string;
    name?: string | null;
    isEmailVerified?: boolean;
    emailVerifiedAt?: string | Date | null;
  }) {
    const emailVerifiedAt = data.emailVerifiedAt
      ? new Date(data.emailVerifiedAt)
      : null;

    return prisma.syncedAuth.upsert({
      where: { id: data.id },
      update: {
        email: data.email,
        name: data.name,
        isEmailVerified: data.isEmailVerified ?? false,
        emailVerifiedAt,
      },
      create: {
        id: data.id,
        email: data.email,
        name: data.name,
        isEmailVerified: data.isEmailVerified ?? false,
        emailVerifiedAt,
      },
    });
  },

  async markSyncedUserEmailVerified(data: {
    id: string;
    email: string;
    verifiedAt: string;
  }) {
    const verifiedAt = new Date(data.verifiedAt);
    return prisma.syncedAuth.upsert({
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
    });
  },
};
