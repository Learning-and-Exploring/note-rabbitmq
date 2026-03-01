import crypto from "crypto";

interface AccessTokenPayload {
  sub: string;
  email: string;
  name?: string | null;
  iat: number;
  exp: number;
}

const DEFAULT_ACCESS_TOKEN_SECRET = "dev_access_secret_change_me";
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

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

export function getAccessTokenTtlSeconds(): number {
  const raw = process.env.ACCESS_TOKEN_TTL_SECONDS;
  const parsed = raw ? Number(raw) : DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
}

export function createAccessToken(input: {
  sub: string;
  email: string;
  name?: string | null;
}): string {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + getAccessTokenTtlSeconds();
  const payload: AccessTokenPayload = { ...input, iat, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(data, getAccessTokenSecret());

  return `${data}.${signature}`;
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

const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 7;

export function createRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiryDate(): Date {
  const raw = process.env.REFRESH_TOKEN_TTL_DAYS;
  const parsed = raw ? Number(raw) : DEFAULT_REFRESH_TOKEN_TTL_DAYS;
  const ttlDays =
    Number.isFinite(parsed) && parsed > 0
      ? Math.floor(parsed)
      : DEFAULT_REFRESH_TOKEN_TTL_DAYS;
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}
