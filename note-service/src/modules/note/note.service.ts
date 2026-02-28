import { prisma } from "../../shared/database";
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
