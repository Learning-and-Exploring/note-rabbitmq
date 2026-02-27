import { ConsumeMessage } from "amqplib";
import { getChannel, QUEUE_NAME } from "../../config/rabbitmq";
import { handleAuthCreated } from "../handlers/auth.event.handler";
import { logger } from "../../shared/logger";

/**
 * Start consuming from the note-service auth events queue.
 * Routes messages to the correct handler based on the routing key.
 */
export async function startAuthConsumer(): Promise<void> {
  const channel = getChannel();

  await channel.consume(QUEUE_NAME, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;
    const rawContent = msg.content.toString();

    try {
      const payload = JSON.parse(rawContent);

      switch (routingKey) {
        case "auth.created":
          await handleAuthCreated(payload);
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
