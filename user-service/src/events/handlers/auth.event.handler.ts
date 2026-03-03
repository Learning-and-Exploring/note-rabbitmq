import { userService } from "../../modules/user/user.service";
import { logger } from "../../shared/logger";

interface AuthCreatedPayload {
  id: string;
  email: string;
  name?: string | null;
  role?: "USER" | "ADMIN";
  createdAt: string;
}

interface AuthEmailVerifiedPayload {
  id: string;
  email: string;
  verifiedAt: string;
}

interface AuthEmailUnverifiedPayload {
  id: string;
  email: string;
}

export async function handleAuthCreated(
  payload: AuthCreatedPayload,
): Promise<void> {
  logger.info(`[EventHandler] Handling auth.created for auth ${payload.id}`);

  await userService.syncFromAuthCreated({
    id: payload.id,
    email: payload.email,
    name: payload.name ?? undefined,
    role: payload.role ?? "USER",
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

export async function handleAuthEmailUnverified(
  payload: AuthEmailUnverifiedPayload,
): Promise<void> {
  logger.info(
    `[EventHandler] Handling auth.email_unverified for auth ${payload.id}`,
  );

  await userService.syncEmailUnverifiedFromAuth({
    id: payload.id,
    email: payload.email,
  });
}
