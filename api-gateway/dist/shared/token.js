"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccessToken = verifyAccessToken;
const crypto_1 = __importDefault(require("crypto"));
const DEFAULT_ACCESS_TOKEN_SECRET = "dev_access_secret_change_me";
function base64UrlDecode(input) {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(normalized + padding, "base64").toString("utf8");
}
function sign(input, secret) {
    return crypto_1.default
        .createHmac("sha256", secret)
        .update(input)
        .digest("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}
function getAccessTokenSecret() {
    return process.env.ACCESS_TOKEN_SECRET ?? DEFAULT_ACCESS_TOKEN_SECRET;
}
function verifyAccessToken(token) {
    const [encodedHeader, encodedPayload, receivedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !receivedSignature) {
        throw new Error("Invalid token format.");
    }
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = sign(data, getAccessTokenSecret());
    if (receivedSignature !== expectedSignature) {
        throw new Error("Invalid token signature.");
    }
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) {
        throw new Error("Token expired.");
    }
    return payload;
}
