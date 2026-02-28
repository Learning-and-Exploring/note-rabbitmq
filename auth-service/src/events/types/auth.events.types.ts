// ── Event name constants ─────────────────────────────────────────────────────
export const AUTH_EVENTS = {
  CREATED: "auth.created",
  UPDATED: "auth.updated",
  EMAIL_VERIFIED: "auth.email_verified",
} as const;

export type AuthEventName = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS];

// ── Event payload shapes ─────────────────────────────────────────────────────
export interface AuthCreatedPayload {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string; // ISO 8601
  emailVerified: boolean;
}

export interface AuthUpdatedPayload {
  id: string;
  email: string;
  name?: string | null;
  updatedAt: string; // ISO 8601
}

export interface AuthEmailVerifiedPayload {
  id: string;
  email: string;
  verifiedAt: string; // ISO 8601
}

// Union type useful for typed consumers
export type AuthEventPayload =
  | AuthCreatedPayload
  | AuthUpdatedPayload
  | AuthEmailVerifiedPayload;
