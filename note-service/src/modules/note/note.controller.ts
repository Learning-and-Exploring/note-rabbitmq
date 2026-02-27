import { Request, Response } from "express";
import { noteService } from "./note.service";

export const noteController = {
  /**
   * POST /notes
   * Body: { authId, title?, content? }
   */
  async createNote(req: Request, res: Response) {
    try {
      const { authId, title, content } = req.body;
      if (!authId) {
        res.status(400).json({ message: "authId is required." });
        return;
      }
      const note = await noteService.createNote({ authId, title, content });
      res.status(201).json({ message: "Note created.", data: note });
    } catch (err: any) {
      res
        .status(500)
        .json({ message: "Internal server error.", detail: err.message });
    }
  },

  /**
   * GET /notes
   * Returns all notes.
   */
  async getAllNotes(_req: Request, res: Response) {
    try {
      const notes = await noteService.getAllNotes();
      res.status(200).json({ data: notes });
    } catch (err: any) {
      res
        .status(500)
        .json({ message: "Internal server error.", detail: err.message });
    }
  },

  /**
   * GET /notes/auth/:authId
   * Returns notes for a specific auth.
   */
  async getNotesByAuth(req: Request, res: Response) {
    try {
      const { authId } = req.params;
      const notes = await noteService.getNotesByAuth(authId as string);
      res.status(200).json({ data: notes });
    } catch (err: any) {
      res
        .status(500)
        .json({ message: "Internal server error.", detail: err.message });
    }
  },

  /**
   * GET /notes/:id
   * Returns a single note.
   */
  async getNoteById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const note = await noteService.getNoteById(id as string);
      res.status(200).json({ data: note });
    } catch (err: any) {
      if (err.message === "Note not found.") {
        res.status(404).json({ message: err.message });
      } else {
        res
          .status(500)
          .json({ message: "Internal server error.", detail: err.message });
      }
    }
  },
};
