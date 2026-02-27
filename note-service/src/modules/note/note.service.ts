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
   * Upsert a synced auth (called by the RabbitMQ event handler).
   */
  async upsertSyncedAuth(data: {
    id: string;
    email: string;
    name?: string | null;
  }) {
    return prisma.syncedAuth.upsert({
      where: { id: data.id },
      update: { email: data.email, name: data.name },
      create: { id: data.id, email: data.email, name: data.name },
    });
  },
};
