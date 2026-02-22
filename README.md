# Folder Structure of Even Driven Architecture 

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)


<h3>🛠 Tech Stack ⚛</h3>

---

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg" alt="Node.js" width="50" height="50" title="Node.js" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg" alt="TypeScript" width="50" height="50" title="TypeScript" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/express/express-original.svg" alt="Express" width="50" height="50" title="Express.js" />
  
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg" alt="Docker" width="50" height="50" title="Docker" />
  <img src="https://cdn.simpleicons.org/rabbitmq/FF6600" alt="RabbitMQ" width="50" height="50" title="RabbitMQ" />
  
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg" alt="MongoDB" width="50" height="50" title="MongoDB" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg" alt="PostgreSQL" width="50" height="50" title="PostgreSQL" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redis/redis-original.svg" alt="Redis" width="50" height="50" title="Redis" />
  
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jest/jest-plain.svg" alt="Jest" width="50" height="50" title="Jest" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/eslint/eslint-original.svg" alt="ESLint" width="50" height="50" title="ESLint" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/githubactions/githubactions-original.svg" alt="GitHub Actions" width="50" height="50" title="GitHub Actions" />
</p>

---

<div align="center">
  <h2>Micro Service Architecture</h2>
  <img src="public/micro-service-architecture.png" alt="Event-Driven Microservices Architecture Diagram" width="800" />
</div>

A scalable, event-driven microservices architecture built with **Node.js** and **TypeScript**. This project demonstrates asynchronous communication between services using **RabbitMQ** to decouple business logic and ensure high availability.

---

## 🏗 System Architecture

The application is split into distinct domain services. Communication is handled via REST APIs for synchronous operations and RabbitMQ for asynchronous event propagation.



### The Flow
1.  **User Service**: Handles user authentication and management. When a user state changes (e.g., created, updated), it **publishes** an event to the message broker.
2.  **RabbitMQ**: Acts as the message broker, routing events to the appropriate queues.
3.  **Note Service**: Manages user notes. It **consumes** user events to maintain data consistency (e.g., creating a default welcome note when a new user registers).

```mermaid
graph LR
    A[Client] -->|HTTP POST /users| B(User Service)
    B -->|Persist to DB| B_DB[(User DB)]
    B -->|Publish 'UserCreated'| C{RabbitMQ Exchange}
    C -->|Route| D[User Queue]
    D -->|Consume| E(Note Service)
    E -->|Execute Handler| E_DB[(Note DB)]
```
```
app/
│
├── docker-compose.yml
│
├── user-service/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       │
│       ├── config/
│       │   ├── env.ts
│       │   └── rabbitmq.ts
│       │
│       ├── modules/
│       │   └── user/
│       │       ├── user.controller.ts
│       │       ├── user.service.ts
│       │       ├── user.model.ts
│       │       ├── user.routes.ts
│       │       └── user.events.ts
│       │
│       ├── events/
│       │   ├── publishers/
│       │   │   └── user.publisher.ts
│       │   └── types/
│       │       └── user.events.types.ts
│       │
│       └── shared/
│           ├── database.ts
│           └── logger.ts
│
└── note-service/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── app.ts
        ├── server.ts
        │
        ├── config/
        │   ├── env.ts
        │   └── rabbitmq.ts
        │
        ├── modules/
        │   └── note/
        │       ├── note.controller.ts
        │       ├── note.service.ts
        │       ├── note.model.ts
        │       └── note.routes.ts
        │
        ├── events/
        │   ├── consumers/
        │   │   └── user.consumer.ts
        │   └── handlers/
        │       └── user.event.handler.ts
        │
        └── shared/
            ├── database.ts
            └── logger.ts
```
---