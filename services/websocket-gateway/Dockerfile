FROM oven/bun:1.0-slim

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
RUN bun install --production

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Expose WebSocket port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3002/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))" || true

CMD ["bun", "src/index.ts"]
