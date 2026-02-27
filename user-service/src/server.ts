import app from "./app";
import { connectRabbitMQ } from "./config/rabbitmq";
import { startAuthConsumer } from "./events/consumers/auth.consumer";
import { env } from "./config/env";
import { logger } from "./shared/logger";

async function bootstrap() {
  // Connect to RabbitMQ before accepting HTTP traffic
  await connectRabbitMQ();
  await startAuthConsumer();

  app.listen(env.PORT, () => {
    logger.info(`[user-service] Running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error("[user-service] Failed to start:", err.message);
  process.exit(1);
});
