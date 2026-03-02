import { Router } from "express";
import { noteController } from "./note.controller";

const router = Router();

// GET /public/notes/:token — fetch public shared note by token
router.get("/:token", noteController.getPublicNoteByToken);

export default router;
