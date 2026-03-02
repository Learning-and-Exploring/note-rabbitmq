// Shared environment variables for user-service
export const env = {
  PORT: process.env.PORT ?? "3002",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  RABBITMQ_URL: process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672",
  ACCESS_TOKEN_SECRET:
    process.env.ACCESS_TOKEN_SECRET ?? "dev_access_secret_change_me",
};
