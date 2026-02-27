import { userService } from "../../modules/user/user.service";
import { logger } from "../../shared/logger";

interface AuthCreatedPayload {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
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
