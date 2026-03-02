import { Router } from "express";
import { noteController } from "./note.controller";

const router = Router();

// POST /notes              — create a note
router.post("/", noteController.createNote);

// GET /notes               — get all notes
router.get("/", noteController.getAllNotes);

// GET /notes/auth/:authId  — get notes for a auth
router.get("/auth/:authId", noteController.getNotesByAuth);

// POST /notes/:id/share    — enable public share and create token
router.post("/:id/share", noteController.shareNoteById);

// DELETE /notes/:id/share  — disable public share
router.delete("/:id/share", noteController.unshareNoteById);

// GET /notes/:id           — get a single note (must come after /auth/:authId)
router.get("/:id", noteController.getNoteById);

// PATCH /notes/:id           — update a single note
router.patch("/:id", noteController.updateNoteById);

// Delete /notes/:id
router.delete("/:id", noteController.deleteNoteById);

export default router;
