import { ConsumeMessage } from "amqplib";
import { getChannel, QUEUE_NAME } from "../../config/rabbitmq";
import { logger } from "../../shared/logger";
import {
  handleAuthCreated,
  handleAuthEmailVerified,
} from "../handlers/auth.event.handler";

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
        case "auth.email_verified":
          await handleAuthEmailVerified(payload);
          break;
        default:
          logger.warn(`[Consumer] Unhandled routing key: "${routingKey}"`);
      }

      channel.ack(msg);
    } catch (err: any) {
      logger.error(
        `[Consumer] Error processing message (key: ${routingKey}):`,
        err.message,
      );
      channel.nack(msg, false, true);
    }
  });

  logger.info(`[Consumer] Listening on queue: "${QUEUE_NAME}"`);
}
