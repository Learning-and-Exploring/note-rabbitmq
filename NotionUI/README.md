# 📝 Notion Nuxt: Event-Driven Architecture

A high-performance, real-time Notion clone built with **Nuxt 3**. This project demonstrates an **Event-Driven Architecture (EDA)** where the frontend acts as both an event producer (user actions) and an event subscriber (real-time updates).



### 🛠 Tech Stack

---

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nuxtjs/nuxtjs-original.svg" alt="Nuxt" width="50" height="50" title="Nuxt 3" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg" alt="TypeScript" width="50" height="50" title="TypeScript" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg" alt="Node.js" width="50" height="50" title="Node.js" />
  
  <img src="https://cdn.simpleicons.org/rabbitmq/FF6600" alt="RabbitMQ" width="50" height="50" title="RabbitMQ" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redis/redis-original.svg" alt="Redis" width="50" height="50" title="Redis (Pub/Sub)" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg" alt="Docker" width="50" height="50" title="Docker" />

  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" width="50" height="50" title="PostgreSQL" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg" alt="MongoDB" width="50" height="50" title="MongoDB" />
  
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jest/jest-plain.svg" alt="Jest" width="50" height="50" title="Jest" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/githubactions/githubactions-original.svg" alt="GitHub Actions" width="50" height="50" title="GitHub Actions" />
</p>

---

## 📂 Folder Structure

This structure separates the **Nuxt UI** from the **Event Logic** and **Background Workers**.

```text
.
├── apps/
│   ├── client/             # Nuxt 3 Frontend (The UI & Event Subscriber)
│   └── workers/            # Node.js Workers (Event Consumers for heavy tasks)
├── components/             # Reusable Vue components (Editor, Sidebar, etc.)
├── composites/             # Shared state & WebSocket listeners
├── server/
│   ├── api/                # Nitro API Routes (The Event Producers)
│   ├── plugins/            # RabbitMQ / Redis connection initializers
│   └── utils/              # Event emitters & validation logic
├── store/                  # Pinia stores for local state sync
├── docker-compose.yml      # Infrastructure (Postgres, RabbitMQ, Redis)
└── nuxt.config.ts          # Nuxt configuration