import app from "./app";
import { connectRabbitMQ } from "./config/rabbitmq";
import { startUserConsumer } from "./events/consumers/user.consumer";
import { env } from "./config/env";
import { logger } from "./shared/logger";

async function bootstrap() {
  // Connect RabbitMQ and start consumer before accepting HTTP traffic
  await connectRabbitMQ();
  await startUserConsumer();

  app.listen(env.PORT, () => {
    logger.info(`[note-service] Running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error("[note-service] Failed to start:", err.message);
  process.exit(1);
});
