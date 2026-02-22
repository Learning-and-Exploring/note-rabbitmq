# RabbitMQ Microservices Project — Full Explanation

## Overview

This project is an **event-driven microservices system** built with **Node.js + TypeScript**. It demonstrates how two independent services (`user-service` and `note-service`) communicate asynchronously using **RabbitMQ** as a message broker, without ever calling each other directly over HTTP.

There is also an **API Gateway** sitting in front of both services to act as a single entry point for clients.

---

## Architecture at a Glance

```
Client (HTTP)
      │
      ▼
┌─────────────┐
│ api-gateway │  :3000  — Reverse proxy for routing
└──────┬──────┘
       │  HTTP
  ─────┴─────────────────────
  ▼                       ▼
┌──────────────┐    ┌──────────────┐
│ user-service │    │ note-service │
│    :3001     │    │    :3002     │
└──────┬───────┘    └──────┬───────┘
       │  PUBLISH          │  CONSUME
       │                   │
       └───────┬───────────┘
               ▼
        ┌────────────┐
        │  RabbitMQ  │  :5672 (AMQP)  /  :15672 (Management UI)
        └────────────┘
               │
  ─────────────────────────
  ▼                        ▼
┌────────┐           ┌───────────┐
│user-db │           │  note-db  │
│ :5433  │           │   :5434   │
│Postgres│           │  Postgres │
└────────┘           └───────────┘
```

**Key principle:** Services **never call each other directly (no HTTP between them)**. Instead, `user-service` **publishes** events to RabbitMQ, and `note-service` **consumes** those events and reacts accordingly.

---

## Folder Structure

```
RabbitMQ/
├── docker-compose.yml          # Orchestrates all 6 services (RabbitMQ, DBs, services, gateway)
├── DATABASE.md                 # Database schema documentation
├── README.md                   # Quick-start guide
├── Explain.md                  # ← You are here
│
├── user-service/               # Produces events to RabbitMQ
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                    # PORT, DATABASE_URL, RABBITMQ_URL
│   ├── prisma/
│   │   └── schema.prisma       # User model (PostgreSQL)
│   └── src/
│       ├── server.ts           # Entry point — boot RabbitMQ then HTTP server
│       ├── app.ts              # Express app setup (middleware, routes, error handlers)
│       ├── config/
│       │   ├── env.ts          # Reads environment variables
│       │   └── rabbitmq.ts     # RabbitMQ connection + channel + exchange declaration
│       ├── events/
│       │   ├── publishers/
│       │   │   └── user.publisher.ts   # publishUserCreated() function
│       │   └── types/
│       │       └── user.events.types.ts  # Event name constants + TypeScript payload interfaces
│       ├── modules/
│       │   └── user/
│       │       ├── user.model.ts       # CreateUserDto, GetUserDto interfaces
│       │       ├── user.routes.ts      # Express Router: POST /users, GET /users, GET /users/:id
│       │       ├── user.controller.ts  # HTTP request/response logic
│       │       ├── user.service.ts     # Business logic (create, get) — calls publisher after DB write
│       │       └── user.events.ts      # Re-export barrel for event types + publisher
│       └── shared/
│           ├── database.ts     # Prisma client singleton
│           └── logger.ts       # Logger wrapper (likely winston/console)
│
├── note-service/               # Consumes events from RabbitMQ
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                    # PORT, DATABASE_URL, RABBITMQ_URL
│   ├── prisma/
│   │   └── schema.prisma       # Note + SyncedUser models (PostgreSQL)
│   └── src/
│       ├── server.ts           # Entry point — boot RabbitMQ + start consumer, then HTTP server
│       ├── app.ts              # Express app setup
│       ├── config/
│       │   ├── env.ts          # Reads environment variables
│       │   └── rabbitmq.ts     # RabbitMQ connection + queue + binding declaration
│       ├── events/
│       │   ├── consumers/
│       │   │   └── user.consumer.ts    # startUserConsumer() — reads messages from queue
│       │   └── handlers/
│       │       └── user.event.handler.ts  # handleUserCreated() — business logic for the event
│       ├── modules/
│       │   └── note/
│       │       ├── note.model.ts       # CreateNoteDto, NoteResponse interfaces
│       │       ├── note.routes.ts      # Express Router: CRUD for notes
│       │       ├── note.controller.ts  # HTTP request/response logic
│       │       └── note.service.ts     # Business logic (CRUD notes + upsertSyncedUser)
│       └── shared/
│           ├── database.ts     # Prisma client singleton
│           └── logger.ts       # Logger wrapper
│
└── api-gateway/                # HTTP reverse proxy (no RabbitMQ involvement)
    ├── Dockerfile
    └── src/
        └── ...                 # Proxies requests to user-service and note-service
```

---

## Service Breakdown

### 1. `user-service` — The Event **Producer**

Exposes a REST API and **publishes RabbitMQ events** whenever user data changes.

#### HTTP API (port 3001)

| Method | Path         | Description       |
| ------ | ------------ | ----------------- |
| POST   | `/users`     | Create a new user |
| GET    | `/users`     | List all users    |
| GET    | `/users/:id` | Get a user by ID  |
| GET    | `/health`    | Health check      |

#### Database Schema (Prisma — `user_service_db`)

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  @@map("users")
}
```

- `id` — UUID generated automatically.
- `email` — Must be unique.
- `passwordHash` — Password is hashed with `bcryptjs` (10 salt rounds) before saving — **never stored as plain text**.
- `name` — Optional.

#### Startup Flow (`server.ts`)

```
1. await connectRabbitMQ()   — establish connection, declare exchange
2. app.listen(PORT)          — start accepting HTTP requests
```

> RabbitMQ must be ready **before** the HTTP server starts. This prevents publishing to a disconnected broker.

---

### 2. `note-service` — The Event **Consumer**

Exposes a REST API for notes and **listens to RabbitMQ events** to react to user lifecycle events.

#### HTTP API (port 3002)

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| POST   | `/notes`              | Create a note manually   |
| GET    | `/notes`              | List all notes           |
| GET    | `/notes/user/:userId` | Get all notes for a user |
| GET    | `/notes/:id`          | Get a note by ID         |

#### Database Schema (Prisma — `note_service_db`)

```prisma
model Note {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  title     String   @default("Welcome Note")
  content   String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("notes")
}

// Local shadow of User data — populated via RabbitMQ events, NOT a DB foreign key
model SyncedUser {
  id       String   @id  -- same UUID from user-service
  name     String?
  email    String
  syncedAt DateTime @default(now()) @map("synced_at")
  @@map("synced_users")
}
```

**Why `SyncedUser`?**  
In microservices, each service owns its own database. `note-service` cannot query `user-service`'s database directly. Instead, when a `user.created` event arrives via RabbitMQ, `note-service` copies the essential user data (`id`, `email`, `name`) into its own `synced_users` table. This is the **"local read model"** pattern.

#### Startup Flow (`server.ts`)

```
1. await connectRabbitMQ()    — connect, assert exchange, assert queue, bind queue
2. await startUserConsumer()  — begin listening on queue
3. app.listen(PORT)           — start accepting HTTP requests
```

---

### 3. `api-gateway` — The Entry Point

Listens on port `3000`. It forwards HTTP requests to the appropriate downstream service:

- Routes for users → `http://user-service:3001`
- Routes for notes → `http://note-service:3002`

There is **no RabbitMQ involvement** in the gateway — it purely handles HTTP routing/proxying.

---

## How RabbitMQ Works in This Project

### Core Concepts Used

| Concept         | Value in this project               | Explanation                                                                       |
| --------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| **Exchange**    | `user.events` (type: `topic`)       | Receives published messages and routes them via routing key                       |
| **Queue**       | `note-service.user.events`          | Holds messages for `note-service` to consume                                      |
| **Binding**     | routing key `user.*`                | Connects the queue to the exchange — matches `user.created`, `user.updated`, etc. |
| **Routing Key** | `user.created`                      | Sent with each message to identify its type                                       |
| **Durability**  | `durable: true` on exchange & queue | Messages survive a RabbitMQ broker restart                                        |
| **Persistence** | `persistent: true` on messages      | Individual messages survive a broker restart                                      |
| **prefetch(1)** | note-service only                   | Process one message at a time — prevents overwhelming the consumer                |
| **ack/nack**    | manual acknowledgement              | Message is only removed from queue after successful processing                    |

### The Topic Exchange Explained

A **topic exchange** routes messages based on a **routing key pattern**. The `#` wildcard matches zero or more words, and `*` matches exactly one word.

```
Exchange: user.events  (topic)
                │
    ┌───────────┴───────────────┐
    │  Binding: routing key     │
    │  pattern = "user.*"       │
    └───────────┬───────────────┘
                │
    Queue: note-service.user.events
```

So if tomorrow you add a new service (e.g., `email-service`) that also wants to receive `user.created`, it just declares its **own queue** and binds it to the **same exchange** with the same pattern — no changes to `user-service` are needed. This is the power of the Publish–Subscribe pattern.

### The Full Event Flow — Step by Step

#### When a new user registers (`POST /users`):

```
1. Client → POST http://localhost:3000/users
              { email, password, name }

2. api-gateway → forwards to → user-service:3001/users

3. user-service (user.controller.ts)
   └── validates request body

4. user-service (user.service.ts)
   ├── Hash password with bcryptjs
   ├── INSERT user into user_service_db (Postgres)
   └── publishUserCreated({ id, email, name, createdAt })
           ↓
5. user.publisher.ts
   └── channel.publish(
         exchange: "user.events",
         routingKey: "user.created",
         content: JSON.stringify(payload),
         { persistent: true }
       )
           ↓ (async, non-blocking)
6. RabbitMQ broker
   └── Routes "user.created" → queue "note-service.user.events"
           ↓
7. note-service (user.consumer.ts) — always running
   └── Receives message from queue
   └── Reads routingKey from message fields
   └── switch(routingKey):
         case "user.created": handleUserCreated(payload) ✓
         default: logs warning, acks message

8. user.event.handler.ts
   ├── noteService.upsertSyncedUser({ id, email, name })
   │     → INSERT/UPDATE synced_users in note_service_db
   │
   └── noteService.createNote({
           userId: id,
           title: "Welcome! 🎉",
           content: "Hello <name>! This is your first note..."
       })
         → INSERT into notes in note_service_db

9. channel.ack(msg)  — acknowledge success, remove from queue

   ─── If an error occurs in step 8 ───
   channel.nack(msg, false, true)  — reject + requeue once
```

### What happens if `note-service` is down?

Because the queue is **durable**, RabbitMQ holds the messages. When `note-service` comes back online, it reconnects and processes all messages that were waiting. **No events are lost.**

### Separation of Concerns in the Event Flow

```
config/rabbitmq.ts     — Low-level: connection, channel, exchange/queue setup
events/publishers/     — Sending: knows WHAT to publish and WHERE (exchange, routing key)
events/consumers/      — Receiving: reads raw messages, routes by key to handlers
events/handlers/       — Reacting: business logic of "what to do when X event arrives"
modules/*/service.ts   — Data: actual DB operations (create, update, find)
```

This layered design means each file has one clear responsibility.

---

## Database Design

### `user-service` owns `user_service_db`

```
┌──────────────────────────────────────────────────────┐
│                       users                          │
├────────────────┬─────────────────────────────────────┤
│ id             │ UUID (PK, auto-generated)            │
│ email          │ VARCHAR (unique)                     │
│ password_hash  │ VARCHAR (bcrypt hash)                │
│ name           │ VARCHAR (nullable)                   │
│ created_at     │ TIMESTAMP                            │
│ updated_at     │ TIMESTAMP (auto-updated)             │
└────────────────┴─────────────────────────────────────┘
```

### `note-service` owns `note_service_db`

```
┌──────────────────────────────────────────────────────┐
│                       notes                          │
├────────────────┬─────────────────────────────────────┤
│ id             │ UUID (PK, auto-generated)            │
│ user_id        │ UUID (references synced_users.id     │
│                │  — no DB-level FK across services)   │
│ title          │ VARCHAR (default: "Welcome Note")    │
│ content        │ TEXT (nullable)                      │
│ created_at     │ TIMESTAMP                            │
│ updated_at     │ TIMESTAMP (auto-updated)             │
└────────────────┴─────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                   synced_users                       │
├────────────────┬─────────────────────────────────────┤
│ id             │ UUID (PK — same UUID as user-service)│
│ email          │ VARCHAR                              │
│ name           │ VARCHAR (nullable)                   │
│ synced_at      │ TIMESTAMP                            │
└────────────────┴─────────────────────────────────────┘
```

**Important:** There is **no database-level foreign key** between `note_service_db.synced_users` and `user_service_db.users`. The relationship is maintained purely through event-driven synchronisation via RabbitMQ. This is intentional — it preserves database isolation between microservices.

---

## Docker Compose — Infrastructure Setup

The `docker-compose.yml` runs 6 containers on the same Docker bridge network (`microservices-net`):

| Container      | Image                           | Port (host) | Purpose                         |
| -------------- | ------------------------------- | ----------- | ------------------------------- |
| `rabbitmq`     | rabbitmq:3.13-management-alpine | 5672, 15672 | Message broker + Management UI  |
| `user-db`      | postgres:16-alpine              | 5433        | user-service's PostgreSQL DB    |
| `note-db`      | postgres:16-alpine              | 5434        | note-service's PostgreSQL DB    |
| `user-service` | Built from `./user-service`     | 3001        | User management API + publisher |
| `note-service` | Built from `./note-service`     | 3002        | Notes API + event consumer      |
| `api-gateway`  | Built from `./api-gateway`      | 3000        | Single HTTP entry point         |

### Health Checks & Startup Order

Docker Compose uses `depends_on` with `condition: service_healthy` to ensure startup order:

```
rabbitmq     →  healthy
user-db      →  healthy
note-db      →  healthy
                   ↓
user-service (waits for user-db + rabbitmq to be healthy)
note-service (waits for note-db + rabbitmq to be healthy)
                   ↓
api-gateway  (waits for user-service + note-service to start)
```

This prevents services from crashing on startup due to missing dependencies.

### Ports Summary

| Service            | Internal Port | External (host) Port |
| ------------------ | ------------- | -------------------- |
| api-gateway        | 3000          | 3000                 |
| user-service       | 3001          | 3001                 |
| note-service       | 3002          | 3002                 |
| user-db (Postgres) | 5432          | 5433                 |
| note-db (Postgres) | 5432          | 5434                 |
| RabbitMQ AMQP      | 5672          | 5672                 |
| RabbitMQ UI        | 15672         | 15672                |

> The databases are mapped to different host ports (5433, 5434) to avoid conflicts with any local Postgres installation running on the default port 5432.

---

## Key Design Patterns & Concepts

### 1. Event-Driven Architecture

Services are **loosely coupled**. `user-service` does not know about `note-service`. It simply fires a `user.created` event. Any service that cares can subscribe. Adding more consumers in the future requires **zero changes** to `user-service`.

### 2. Fire-and-Forget Publishing

In `user.service.ts`, after a user is saved to the database:

```typescript
publishUserCreated({ id, email, name, createdAt }); // no await!
```

This is intentional. The HTTP response returns immediately to the client. The event is published asynchronously in the background. RabbitMQ guarantees delivery.

### 3. At-Least-Once Delivery + Manual Acknowledgement

```typescript
channel.ack(msg); // success — remove from queue
channel.nack(msg, false, true); // failure — requeue once
```

The message is only removed from the queue **after** the handler finishes successfully. If processing fails, the message is requeued and retried. This ensures **no event is silently dropped**.

### 4. Singleton Connection Pattern

Both services keep a **single shared RabbitMQ connection and channel** (module-level variables). A `getChannel()` helper provides safe access:

```typescript
export function getChannel(): Channel {
  if (!channel) throw new Error("RabbitMQ channel not initialised.");
  return channel;
}
```

This avoids the overhead of creating new connections on every request.

### 5. Local Read Model (SyncedUser)

`note-service` maintains its own copy of user data in `synced_users`. This allows note-service to:

- Work fully offline from user-service.
- Join/query user info without cross-service HTTP calls.
- Remain consistent via event-driven updates.

### 6. Environment Variable Configuration

Both services use a `config/env.ts` file that centralises all environment variables with sensible defaults for local development:

```typescript
export const env = {
  PORT: process.env.PORT ?? "3001",
  RABBITMQ_URL: process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672",
  ...
};
```

### 7. Prisma ORM

Both services use [Prisma](https://www.prisma.io/) as their database ORM:

- `prisma/schema.prisma` — defines the database models and types.
- `src/shared/database.ts` — exports a **singleton** `PrismaClient` instance (global caching pattern to prevent connection exhaustion in development hot-reload).

---

## How to Run

### With Docker Compose (recommended)

```bash
docker compose up --build
```

### Useful URLs once running

| URL                          | Description                          |
| ---------------------------- | ------------------------------------ |
| http://localhost:3000        | API Gateway (main entry point)       |
| http://localhost:3001/health | user-service health check            |
| http://localhost:3002/health | note-service health check            |
| http://localhost:15672       | RabbitMQ Management UI (guest/guest) |

### Example API calls

```bash
# Create a user (triggers the full RabbitMQ event flow)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123","name":"Alice"}'

# Get all notes (alice's welcome note should appear automatically)
curl http://localhost:3000/notes

# Get notes for a specific user
curl http://localhost:3000/notes/user/<userId>
```

---

## Summary

| Aspect                | Detail                                                  |
| --------------------- | ------------------------------------------------------- |
| Language              | TypeScript (Node.js)                                    |
| Framework             | Express.js                                              |
| Message Broker        | RabbitMQ 3.13 (AMQP protocol)                           |
| Exchange Type         | Topic exchange (`user.events`)                          |
| ORM                   | Prisma                                                  |
| Database              | PostgreSQL 16 (separate DB per service)                 |
| Containerisation      | Docker + Docker Compose                                 |
| Communication Pattern | Publish/Subscribe via RabbitMQ (async, one-way)         |
| HTTP (inter-service)  | ❌ Not used — services do not call each other over HTTP |
| Event produced        | `user.created` (routing key)                            |
| Event consumed        | `user.created` → sync user + create welcome note        |
