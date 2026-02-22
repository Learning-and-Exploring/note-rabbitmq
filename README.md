# Folder Structure of Even Driven Architecture 

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