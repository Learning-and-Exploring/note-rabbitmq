import { Router } from "express";
import { noteController } from "./note.controller";

const router = Router();

// POST /notes              — create a note
router.post("/", noteController.createNote);

// GET /notes               — get all notes
router.get("/", noteController.getAllNotes);

// GET /notes/user/:userId  — get notes for a user
router.get("/user/:userId", noteController.getNotesByUser);

// GET /notes/:id           — get a single note (must come after /user/:userId)
router.get("/:id", noteController.getNoteById);

export default router;
