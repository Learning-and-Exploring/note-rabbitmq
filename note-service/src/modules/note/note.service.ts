import { prisma } from "../../shared/database";
import { CreateNoteDto } from "./note.model";

export const noteService = {
  /**
   * Create a note for a given user.
   */
  async createNote(dto: CreateNoteDto) {
    return prisma.note.create({
      data: {
        userId: dto.userId,
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
   * Get all notes belonging to a specific user.
   */
  async getNotesByUser(userId: string) {
    return prisma.note.findMany({
      where: { userId },
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
  }) {
    return prisma.syncedUser.upsert({
      where: { id: data.id },
      update: { email: data.email, name: data.name },
      create: { id: data.id, email: data.email, name: data.name },
    });
  },
};
