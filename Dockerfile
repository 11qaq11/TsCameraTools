# ---- Stage 1: Build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run web:build

# ---- Stage 2: Production ----
FROM node:20-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy build artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy Linux binaries
COPY bin/ttyd/ttyd-linux /usr/local/bin/ttyd
COPY bin/platform-tools-linux/ /usr/local/bin/platform-tools/
RUN chmod +x /usr/local/bin/ttyd /usr/local/bin/platform-tools/adb

# Copy migration scripts
COPY server/db/migrations ./dist/server/db/migrations

EXPOSE 3000
CMD ["node", "dist/server/index.js"]
