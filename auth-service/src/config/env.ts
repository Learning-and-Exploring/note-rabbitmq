// Shared environment variables for auth-service
export const env = {
  PORT: process.env.PORT ?? "3001",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  RABBITMQ_URL: process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672",
  ACCESS_TOKEN_SECRET:
    process.env.ACCESS_TOKEN_SECRET ?? "dev_access_secret_change_me",
  ACCESS_TOKEN_TTL_SECONDS: process.env.ACCESS_TOKEN_TTL_SECONDS ?? "900",
  REFRESH_TOKEN_TTL_DAYS: process.env.REFRESH_TOKEN_TTL_DAYS ?? "7",
  EMAIL_OTP_TTL_MINUTES: process.env.EMAIL_OTP_TTL_MINUTES ?? "5",
  EMAIL_OTP_RESEND_COOLDOWN_SECONDS:
    process.env.EMAIL_OTP_RESEND_COOLDOWN_SECONDS ?? "60",
  EMAIL_OTP_MAX_ATTEMPTS: process.env.EMAIL_OTP_MAX_ATTEMPTS ?? "5",
  SMTP_HOST: process.env.SMTP_HOST ?? "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT ?? "465",
  SMTP_USER: process.env.SMTP_USER ?? "",
  SMTP_PASS: process.env.SMTP_PASS ?? "",
  SMTP_FROM: process.env.SMTP_FROM ?? "",
};
