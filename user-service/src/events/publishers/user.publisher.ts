import { getChannel } from "../../config/rabbitmq";
import { USER_EVENTS, UserCreatedPayload } from "../types/user.events.types";
import { logger } from "../../shared/logger";

const USER_EXCHANGE_NAME = "user.events";

/**
 * Publish a `user.created` event to the RabbitMQ exchange.
 * Routing key: "user.created"
 */
export function publishUserCreated(payload: UserCreatedPayload): void {
  try {
    const channel = getChannel();
    const routingKey = USER_EVENTS.CREATED;
    const content = Buffer.from(JSON.stringify(payload));
    channel.assertExchange(USER_EXCHANGE_NAME, "topic", { durable: true });

    channel.publish(USER_EXCHANGE_NAME, routingKey, content, {
      persistent: true, // message survives broker restart
      contentType: "application/json",
    });

    logger.info(`[Publisher] Published "${routingKey}" for user ${payload.id}`);
  } catch (err: any) {
    logger.error("[Publisher] Failed to publish user.created:", err.message);
  }
}
