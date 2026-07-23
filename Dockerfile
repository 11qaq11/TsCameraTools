# ---- Stage 1: Build ----
FROM node:22-alpine AS builder
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci --legacy-peer-deps --ignore-scripts
COPY . .
RUN npm run web:build

# ---- Stage 2: Production ----
FROM node:22-alpine
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
 && apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production

# Copy build artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci --omit=dev --legacy-peer-deps --ignore-scripts

# Copy migration scripts
COPY server/db/migrations ./dist/server/db/migrations

EXPOSE 3000
CMD ["node", "dist/server/index.js"]
