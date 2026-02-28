import { noteService } from "../../modules/note/note.service";
import { logger } from "../../shared/logger";

interface UserCreatedPayload {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
}

interface UserEmailVerifiedPayload {
  id: string;
  email: string;
  verifiedAt: string;
}

/**
 * Handle a `user.created` RabbitMQ event.
 * 1. Upsert the SyncedAuth local copy (author identity)
 * 2. Create a default welcome Note
 */
export async function handleUserCreated(
  payload: UserCreatedPayload,
): Promise<void> {
  logger.info(`[EventHandler] Handling user.created for user ${payload.id}`);

  await noteService.upsertSyncedUser({
    id: payload.id,
    email: payload.email,
    name: payload.name,
    isEmailVerified: false,
    emailVerifiedAt: null,
  });

  await noteService.createNote({
    authId: payload.id,
    title: "Welcome! 🎉",
    content: `Hello ${payload.name ?? payload.email}! This is your first note. Start writing!`,
  });

  logger.info(
    `[EventHandler] Synced user and created welcome note for ${payload.id}`,
  );
}

export async function handleUserEmailVerified(
  payload: UserEmailVerifiedPayload,
): Promise<void> {
  logger.info(
    `[EventHandler] Handling user.email_verified for user ${payload.id}`,
  );

  await noteService.markSyncedUserEmailVerified({
    id: payload.id,
    email: payload.email,
    verifiedAt: payload.verifiedAt,
  });
}
