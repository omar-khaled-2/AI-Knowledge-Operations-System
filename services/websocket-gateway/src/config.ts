import type { ServerConfig } from './types';

export function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3002', 10) || 3002,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    redisPassword: process.env.REDIS_PASSWORD || undefined,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || 'change-me-in-production',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10) || 30000,
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}
