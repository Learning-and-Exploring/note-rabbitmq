import { Router } from "express";
import { noteController } from "./note.controller";

const router = Router();

// POST /notes              — create a note
router.post("/", noteController.createNote);

// GET /notes               — get all notes
router.get("/", noteController.getAllNotes);

// GET /notes/auth/:authId  — get notes for a auth
router.get("/auth/:authId", noteController.getNotesByAuth);

// GET /notes/:id           — get a single note (must come after /auth/:authId)
router.get("/:id", noteController.getNoteById);

export default router;
