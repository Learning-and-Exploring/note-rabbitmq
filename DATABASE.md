# 🗄️ Database Design

This project uses **PostgreSQL** as the database engine and **Prisma** as the ORM, with a strict **database-per-service** pattern — a core principle of microservice architecture.

---

## Why Database-Per-Service?

Each service owns its own isolated database. Services **never share** a database or query each other's tables directly.

```
auth-service  →  auth_service_db  (PostgreSQL)
note-service  →  note_service_db  (PostgreSQL)
```

This enforces:

- **Loose coupling** — services can change their schema independently
- **Fault isolation** — one DB going down doesn't affect the other
- **Data ownership** — each service is the single source of truth for its own data

Cross-service data is shared exclusively via **RabbitMQ events**, not direct DB queries.

---

## ORM — Prisma

[Prisma](https://www.prisma.io/) was chosen for:

| Feature                         | Benefit                               |
| ------------------------------- | ------------------------------------- |
| Auto-generated TypeScript types | Full type-safety from schema to query |
| `schema.prisma` file            | Single source of truth for DB schema  |
| Migration system                | Version-controlled SQL migrations     |
| Prisma Studio                   | Visual DB browser for development     |

Each service has its own `prisma/` directory with a completely independent schema.

---

## Schemas

### `auth-service` — `auth_service_db`

```prisma
model Auth {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  @@map("auths")
}
```

**Purpose:** Stores registered auths. This is the **source of truth** for auth identity. When a auth is created/updated, the service publishes a RabbitMQ event so other services can react.

---

### `note-service` — `note_service_db`

```prisma
model Note {
  id        String   @id @default(uuid())
  authId    String   @map("auth_id")
  title     String   @default("Welcome Note")
  content   String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("notes")
}

model SyncedAuth {
  id       String   @id
  name     String?
  email    String
  syncedAt DateTime @default(now()) @map("synced_at")

  @@map("synced_auths")
}
```

**Purpose:**

- `Note` — stores auth notes. `authId` is a plain column (not a FK to another service's DB).
- `SyncedAuth` — a **local shadow copy** of auth data populated by consuming `auth.created` / `auth.updated` RabbitMQ events. This avoids synchronous calls to `auth-service` at query time.

> ⚠️ `SyncedAuth` is intentionally **not** a foreign key to `auth-service`'s DB. Services must never cross DB boundaries.

---

## Prisma Client Singleton

Both services use a shared singleton pattern to prevent multiple Prisma instances in development:

```typescript
// src/shared/database.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["query", "info", "warn", "error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Import it anywhere in the service:

```typescript
import { prisma } from "../shared/database";

const auth = await prisma.auth.findUnique({ where: { id } });
```

---

## Environment Variables

Each service has its own `.env` file:

| Service        | Variable       | Example Value                                                   |
| -------------- | -------------- | --------------------------------------------------------------- |
| `auth-service` | `DATABASE_URL` | `postgresql://postgres:password@localhost:5433/auth_service_db` |
| `note-service` | `DATABASE_URL` | `postgresql://postgres:password@localhost:5434/note_service_db` |

In Docker, these are injected via `docker-compose.yml` and point to the service containers (`auth-db`, `note-db`).

---

## Useful Commands

Run these inside the respective service directory:

```bash
# Generate Prisma client (after schema changes)
npm run db:generate

# Create and apply a new migration
npm run db:migrate

# Apply migrations in production (used inside Docker CMD)
npx prisma migrate deploy

# Open Prisma Studio (visual DB browser)
npm run db:studio

# Push schema changes without migration (quick prototyping)
npm run db:push
```

---

## Docker Setup

The `docker-compose.yml` provisions two isolated Postgres containers:

| Container | DB Name           | Host Port |
| --------- | ----------------- | --------- |
| `auth-db` | `auth_service_db` | `5433`    |
| `note-db` | `note_service_db` | `5434`    |

Both use the `postgres:16-alpine` image with health checks. Services wait for their DB to be healthy before starting, which automatically runs `prisma migrate deploy` on boot.
