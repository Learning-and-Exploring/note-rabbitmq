import { getChannel, USER_EXCHANGE_NAME } from "../../config/rabbitmq";
import {
  USER_EVENTS,
  UserCreatedPayload,
  UserEmailVerifiedPayload,
} from "../types/user.events.types";
import { logger } from "../../shared/logger";

/**
 * Publish a `user.created` event to the RabbitMQ exchange.
 * Routing key: "user.created"
 */
export function publishUserCreated(payload: UserCreatedPayload): void {
  try {
    const channel = getChannel();
    const routingKey = USER_EVENTS.CREATED;
    const content = Buffer.from(JSON.stringify(payload));

    channel.publish(USER_EXCHANGE_NAME, routingKey, content, {
      persistent: true, // message survives broker restart
      contentType: "application/json",
    });

    logger.info(`[Publisher] Published "${routingKey}" for user ${payload.id}`);
  } catch (err: any) {
    logger.error("[Publisher] Failed to publish user.created:", err.message);
  }
}

/**
 * Publish a `user.email_verified` event to the RabbitMQ exchange.
 * Routing key: "user.email_verified"
 */
export function publishUserEmailVerified(
  payload: UserEmailVerifiedPayload,
): void {
  try {
    const channel = getChannel();
    const routingKey = USER_EVENTS.EMAIL_VERIFIED;
    const content = Buffer.from(JSON.stringify(payload));

    channel.publish(USER_EXCHANGE_NAME, routingKey, content, {
      persistent: true,
      contentType: "application/json",
    });

    logger.info(`[Publisher] Published "${routingKey}" for user ${payload.id}`);
  } catch (err: any) {
    logger.error("[Publisher] Failed to publish user.email_verified:", err.message);
  }
}
