// ── Event name constants ─────────────────────────────────────────────────────
export const USER_EVENTS = {
  CREATED: "user.created",
  UPDATED: "user.updated",
} as const;

export type UserEventName = (typeof USER_EVENTS)[keyof typeof USER_EVENTS];

// ── Event payload shapes ─────────────────────────────────────────────────────
export interface UserCreatedPayload {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string; // ISO 8601
}

export interface UserUpdatedPayload {
  id: string;
  email: string;
  name?: string | null;
  updatedAt: string; // ISO 8601
}

// Union type useful for typed consumers
export type UserEventPayload = UserCreatedPayload | UserUpdatedPayload;
