FROM node:20-alpine AS base
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ── Build TypeScript ──────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Generate Prisma client in the runner stage
RUN npx prisma generate

EXPOSE 3002

# Run migrations then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
