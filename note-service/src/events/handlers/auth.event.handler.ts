import { noteService } from "../../modules/note/note.service";
import { logger } from "../../shared/logger";

interface AuthCreatedPayload {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
}

/**
 * Handle a `auth.created` RabbitMQ event.
 * 1. Upsert the SyncedAuth local copy
 * 2. Create a default welcome Note
 */
export async function handleAuthCreated(
  payload: AuthCreatedPayload,
): Promise<void> {
  logger.info(`[EventHandler] Handling auth.created for auth ${payload.id}`);

  // 1. Sync the auth data locally
  await noteService.upsertSyncedAuth({
    id: payload.id,
    email: payload.email,
    name: payload.name,
  });

  // 2. Create a default welcome note
  await noteService.createNote({
    authId: payload.id,
    title: "Welcome! 🎉",
    content: `Hello ${payload.name ?? payload.email}! This is your first note. Start writing!`,
  });

  logger.info(
    `[EventHandler] Synced auth and created welcome note for ${payload.id}`,
  );
}
