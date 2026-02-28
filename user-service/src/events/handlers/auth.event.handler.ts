import { userService } from "../../modules/user/user.service";
import { logger } from "../../shared/logger";

interface AuthCreatedPayload {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
}

interface AuthEmailVerifiedPayload {
  id: string;
  email: string;
  verifiedAt: string;
}

export async function handleAuthCreated(
  payload: AuthCreatedPayload,
): Promise<void> {
  logger.info(`[EventHandler] Handling auth.created for auth ${payload.id}`);

  await userService.syncFromAuthCreated({
    id: payload.id,
    email: payload.email,
    name: payload.name ?? undefined,
  });
}

export async function handleAuthEmailVerified(
  payload: AuthEmailVerifiedPayload,
): Promise<void> {
  logger.info(
    `[EventHandler] Handling auth.email_verified for auth ${payload.id}`,
  );

  await userService.syncEmailVerifiedFromAuth({
    id: payload.id,
    email: payload.email,
    verifiedAt: payload.verifiedAt,
  });
}
