import { getChannel, EXCHANGE_NAME } from "../../config/rabbitmq";
import {
  AUTH_EVENTS,
  AuthCreatedPayload,
  AuthEmailVerifiedPayload,
} from "../types/auth.events.types";
import { logger } from "../../shared/logger";

/**
 * Publish a `auth.created` event to the RabbitMQ exchange.
 * Routing key: "auth.created"
 */
export function publishAuthCreated(payload: AuthCreatedPayload): void {
  try {
    const channel = getChannel();
    const routingKey = AUTH_EVENTS.CREATED;
    const content = Buffer.from(JSON.stringify(payload));

    channel.publish(EXCHANGE_NAME, routingKey, content, {
      persistent: true, // message survives broker restart
      contentType: "application/json",
    });

    logger.info(`[Publisher] Published "${routingKey}" for auth ${payload.id}`);
  } catch (err: any) {
    logger.error("[Publisher] Failed to publish auth.created:", err.message);
  }
}

/**
 * Publish a `auth.email_verified` event to the RabbitMQ exchange.
 * Routing key: "auth.email_verified"
 */
export function publishAuthEmailVerified(
  payload: AuthEmailVerifiedPayload,
): void {
  try {
    const channel = getChannel();
    const routingKey = AUTH_EVENTS.EMAIL_VERIFIED;
    const content = Buffer.from(JSON.stringify(payload));

    channel.publish(EXCHANGE_NAME, routingKey, content, {
      persistent: true,
      contentType: "application/json",
    });

    logger.info(`[Publisher] Published "${routingKey}" for auth ${payload.id}`);
  } catch (err: any) {
    logger.error("[Publisher] Failed to publish auth.email_verified:", err.message);
  }
}
