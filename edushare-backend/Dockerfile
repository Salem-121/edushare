# Multi-stage build: keep the production image lean (no dev deps, no Prisma CLI).
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
# OpenSSL is required by Prisma's engines on Alpine.
RUN apk add --no-cache openssl \
 && npm ci --omit=dev \
 && npx prisma generate

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

# OpenSSL runtime for Prisma; tini for proper PID-1 signal handling.
RUN apk add --no-cache openssl tini \
 && addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --from=deps --chown=app:app /app/prisma ./prisma
COPY --chown=app:app package*.json ./
COPY --chown=app:app src ./src

# Persisted upload dir — mount a volume here in production.
RUN mkdir -p /app/uploads && chown -R app:app /app/uploads

USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/app.js"]
