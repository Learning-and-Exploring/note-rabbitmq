import { ConsumeMessage } from "amqplib";
import { getChannel, QUEUE_NAME } from "../../config/rabbitmq";
import {
  handleUserCreated,
  handleUserEmailVerified,
} from "../handlers/user.event.handler";
import { logger } from "../../shared/logger";

/**
 * Start consuming from the note-service user events queue.
 * Routes messages to the correct handler based on the routing key.
 */
export async function startUserConsumer(): Promise<void> {
  const channel = getChannel();

  await channel.consume(QUEUE_NAME, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;
    const rawContent = msg.content.toString();

    try {
      const payload = JSON.parse(rawContent);

      switch (routingKey) {
        case "user.created":
          await handleUserCreated(payload);
          break;
        case "user.email_verified":
          await handleUserEmailVerified(payload);
          break;
        default:
          logger.warn(`[Consumer] Unhandled routing key: "${routingKey}"`);
      }

      // Acknowledge the message only after successful processing
      channel.ack(msg);
    } catch (err: any) {
      logger.error(
        `[Consumer] Error processing message (key: ${routingKey}):`,
        err.message,
      );
      // Reject and requeue the message once
      channel.nack(msg, false, true);
    }
  });

  logger.info(`[Consumer] Listening on queue: "${QUEUE_NAME}"`);
}
