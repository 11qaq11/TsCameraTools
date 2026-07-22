# ---- Stage 1: Build ----
FROM node:22-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run web:build

# ---- Stage 2: Production ----
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ libc6-compat && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy build artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Clean up build tools to reduce image size after native module compilation
RUN apt-get remove -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Copy Linux binaries (uncomment when binaries are available)
# COPY bin/ttyd/ttyd-linux /usr/local/bin/ttyd
# COPY bin/platform-tools-linux/ /usr/local/bin/platform-tools/
# RUN chmod +x /usr/local/bin/ttyd /usr/local/bin/platform-tools/adb

# Copy migration scripts
COPY server/db/migrations ./dist/server/db/migrations

EXPOSE 3000
CMD ["node", "dist/server/index.js"]
