import crypto from "crypto";

interface AccessTokenPayload {
  sub: string;
  email: string;
  name?: string | null;
  iat: number;
  exp: number;
}

const DEFAULT_ACCESS_TOKEN_SECRET = "dev_access_secret_change_me";

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function sign(input: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(input)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getAccessTokenSecret(): string {
  return process.env.ACCESS_TOKEN_SECRET ?? DEFAULT_ACCESS_TOKEN_SECRET;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const [encodedHeader, encodedPayload, receivedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !receivedSignature) {
    throw new Error("Invalid token format.");
  }

  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = sign(data, getAccessTokenSecret());

  if (receivedSignature !== expectedSignature) {
    throw new Error("Invalid token signature.");
  }

  const payload = JSON.parse(
    base64UrlDecode(encodedPayload),
  ) as AccessTokenPayload;
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) {
    throw new Error("Token expired.");
  }

  return payload;
}
