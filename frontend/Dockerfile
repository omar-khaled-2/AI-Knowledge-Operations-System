FROM oven/bun:1 as builder
# API_URL: Internal backend URL for server-side proxy (e.g., http://backend-backend in K8s)
ARG API_URL
# NEXT_PUBLIC_API_URL: Client-side fallback (not used directly since auth goes through proxy)
ARG NEXT_PUBLIC_API_URL
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
