FROM oven/bun:1 as builder
WORKDIR /app

# Install build dependencies for native Node.js modules (Mongoose, Better Auth)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lockb* ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Runtime secrets (pass via --env-file or -e at runtime):
#   S3_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_ENDPOINT
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
#   MONGODB_HOST, MONGODB_PORT, MONGODB_DATABASE, MONGODB_USER, MONGODB_PASSWORD
#   BETTER_AUTH_URL, BETTER_AUTH_SECRET
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
