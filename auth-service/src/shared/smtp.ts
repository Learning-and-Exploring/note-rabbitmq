import tls from "tls";
import { env } from "../config/env";
import { logger } from "./logger";

const SOCKET_TIMEOUT_MS = 15000;

interface SendOtpEmailInput {
  to: string;
  name?: string | null;
  otp: string;
  expiresInMinutes: number;
}

function readNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function base64(input: string): string {
  return Buffer.from(input, "utf8").toString("base64");
}

function sanitize(input: string): string {
  return input.replace(/[\r\n]+/g, " ").trim();
}

function createSocket(host: string, port: number): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
      },
      () => resolve(socket),
    );
    socket.setTimeout(SOCKET_TIMEOUT_MS, () => {
      socket.destroy(new Error("SMTP socket timeout."));
    });
    socket.once("error", reject);
  });
}

function waitForReply(socket: tls.TLSSocket): Promise<{ code: number; text: string }> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const lines: string[] = [];

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString("utf8");

      while (buffer.includes("\r\n")) {
        const idx = buffer.indexOf("\r\n");
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        if (!line) continue;
        lines.push(line);

        const match = /^(\d{3})([ -])/.exec(line);
        if (!match) continue;

        const code = Number(match[1]);
        const separator = match[2];
        if (separator === " ") {
          cleanup();
          resolve({ code, text: lines.join("\n") });
          return;
        }
      }
    };

    socket.on("data", onData);
    socket.once("error", onError);
  });
}

async function sendCommand(
  socket: tls.TLSSocket,
  command: string,
  expectedCode: number,
): Promise<void> {
  socket.write(`${command}\r\n`);
  const reply = await waitForReply(socket);
  if (reply.code !== expectedCode) {
    throw new Error(`SMTP command failed: ${command}. Reply: ${reply.text}`);
  }
}

function buildMessage(input: SendOtpEmailInput): string {
  const from = sanitize(env.SMTP_FROM || env.SMTP_USER);
  const to = sanitize(input.to);
  const subject = "Your email verification code";
  const name = input.name ? sanitize(input.name) : "there";
  const textBody =
    `Hi ${name},\n\n` +
    `Your verification code is: ${input.otp}\n` +
    `This code expires in ${input.expiresInMinutes} minutes.\n\n` +
    "If you did not request this, please ignore this email.";

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    textBody,
  ].join("\r\n");
}

export async function sendVerificationOtpEmail(input: SendOtpEmailInput): Promise<void> {
  const host = env.SMTP_HOST;
  const port = readNumber(env.SMTP_PORT, 465);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.SMTP_FROM || user;

  if (!user || !pass || !from) {
    if (env.NODE_ENV === "production") {
      throw new Error("SMTP credentials are not configured.");
    }
    logger.warn(
      `[auth-service] SMTP is not configured. OTP for ${input.to}: ${input.otp}`,
    );
    return;
  }

  const socket = await createSocket(host, port);
  try {
    const greeting = await waitForReply(socket);
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting failed: ${greeting.text}`);
    }

    await sendCommand(socket, `EHLO ${host}`, 250);
    await sendCommand(socket, `AUTH LOGIN`, 334);
    await sendCommand(socket, base64(user), 334);
    await sendCommand(socket, base64(pass), 235);
    await sendCommand(socket, `MAIL FROM:<${sanitize(from)}>`, 250);
    await sendCommand(socket, `RCPT TO:<${sanitize(input.to)}>`, 250);
    await sendCommand(socket, "DATA", 354);

    const message = `${buildMessage(input)}\r\n.\r\n`;
    socket.write(message);
    const delivered = await waitForReply(socket);
    if (delivered.code !== 250) {
      throw new Error(`SMTP delivery failed: ${delivered.text}`);
    }

    await sendCommand(socket, "QUIT", 221);
  } finally {
    socket.end();
  }
}
