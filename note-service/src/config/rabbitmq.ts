import amqplib, { Channel, ChannelModel } from "amqplib";
import { env } from "./env";
import { logger } from "../shared/logger";

// ── Constants shared with user-service ──────────────────────────────────────
export const EXCHANGE_NAME = "user.events";
export const EXCHANGE_TYPE = "topic";
export const QUEUE_NAME = "note-service.user.events";
export const ROUTING_KEY = "user.*"; // matches user.created, user.updated, etc.

// ── Singleton ────────────────────────────────────────────────────────────────
// amqplib v0.10+ returns ChannelModel from connect()
let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel;

  connection = await amqplib.connect(env.RABBITMQ_URL);
  channel = await connection.createChannel();

  // Mirror the exchange declared in user-service
  await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });

  // Declare a durable queue bound to the exchange
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

  // Process one message at a time
  channel.prefetch(1);

  logger.info(
    `[RabbitMQ] Connected — exchange: "${EXCHANGE_NAME}", queue: "${QUEUE_NAME}"`,
  );

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
  if (!channel) throw new Error("RabbitMQ channel not initialised.");
  return channel;
}
