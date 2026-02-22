import amqplib, { Channel, ChannelModel } from "amqplib";
import { env } from "./env";
import { logger } from "../shared/logger";

// ── Constants ────────────────────────────────────────────────────────────────
export const EXCHANGE_NAME = "user.events";
export const EXCHANGE_TYPE = "topic";

// ── Singleton connection/channel ─────────────────────────────────────────────
// amqplib v0.10+ returns ChannelModel from connect()
let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel;

  connection = await amqplib.connect(env.RABBITMQ_URL);
  channel = await connection.createChannel();

  // Declare a durable topic exchange so messages survive broker restarts
  await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });

  logger.info(`[RabbitMQ] Connected — exchange: "${EXCHANGE_NAME}"`);

  connection.on("close", () => {
    logger.warn("[RabbitMQ] Connection closed.");
    channel = null;
    connection = null;
  });

  connection.on("error", (err: Error) => {
    logger.error("[RabbitMQ] Connection error:", err.message);
  });

  return channel;
}

export function getChannel(): Channel {
  if (!channel)
    throw new Error(
      "RabbitMQ channel not initialised. Call connectRabbitMQ() first.",
    );
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  await channel?.close();
  await connection?.close();
}

