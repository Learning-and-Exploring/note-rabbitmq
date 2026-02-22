import { noteService } from "../../modules/note/note.service";
import { logger } from "../../shared/logger";

interface UserCreatedPayload {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
}

/**
 * Handle a `user.created` RabbitMQ event.
 * 1. Upsert the SyncedUser local copy
 * 2. Create a default welcome Note
 */
export async function handleUserCreated(
  payload: UserCreatedPayload,
): Promise<void> {
  logger.info(`[EventHandler] Handling user.created for user ${payload.id}`);

  // 1. Sync the user data locally
  await noteService.upsertSyncedUser({
    id: payload.id,
    email: payload.email,
    name: payload.name,
  });

  // 2. Create a default welcome note
  await noteService.createNote({
    userId: payload.id,
    title: "Welcome! 🎉",
    content: `Hello ${payload.name ?? payload.email}! This is your first note. Start writing!`,
  });

  logger.info(
    `[EventHandler] Synced user and created welcome note for ${payload.id}`,
  );
}
