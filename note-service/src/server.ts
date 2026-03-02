import app from "./app";
import { connectRabbitMQ } from "./config/rabbitmq";
import { startUserConsumer } from "./events/consumers/user.consumer";
import { env } from "./config/env";
import { logger } from "./shared/logger";

const RABBITMQ_RETRY_DELAY_MS = 3000;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectRabbitMQWithRetry(): Promise<void> {
  // Keep retrying so startup is resilient to broker readiness races.
  for (;;) {
    try {
      await connectRabbitMQ();
      await startUserConsumer();
      return;
    } catch (err: any) {
      logger.warn(
        `[note-service] RabbitMQ not ready: ${err.message}. Retrying in ${RABBITMQ_RETRY_DELAY_MS}ms...`,
      );
      await sleep(RABBITMQ_RETRY_DELAY_MS);
    }
  }
}

async function bootstrap() {
  // Connect RabbitMQ and start consumer before accepting HTTP traffic
  await connectRabbitMQWithRetry();

  app.listen(env.PORT, () => {
    logger.info(`[note-service] Running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error("[note-service] Failed to start:", err.message);
  process.exit(1);
});
