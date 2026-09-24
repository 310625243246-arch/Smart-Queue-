# Multi-stage Dockerfile for SmartQueue Full-Stack Application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies for build
RUN npm install

# Copy source files
COPY . .

# Build Vite frontend and bundle Express server into dist/
RUN npm run build

# Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled frontend and bundled server from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts

EXPOSE 8080 3000

CMD ["node", "dist/server.cjs"]
