import type { ServerWebSocket } from 'bun';
import type { ServerConfig } from './types';
import { RedisClient } from './redis';
import { AuthService } from './auth';
import { logger } from './logger';

interface WSState {
  userId: string;
  socketId: string;
  connectedAt: string;
}

export class WebSocketServer {
  private server: ReturnType<typeof Bun.serve> | null = null;
  private redis: RedisClient;
  private auth: AuthService;
  private userSockets = new Map<string, Set<ServerWebSocket<WSState>>>();
  private heartbeatTimers = new Map<ServerWebSocket<WSState>, Timer>();

  constructor(private config: ServerConfig) {
    this.redis = new RedisClient(config);
    this.auth = new AuthService(config);
  }

  start() {
    this.server = Bun.serve<WSState>({
      port: this.config.port,
      
      fetch: async (req, server) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: this.getCorsHeaders(),
          });
        }

        // Parse URL to get ticket from query params
        const url = new URL(req.url);
        const ticket = url.searchParams.get('ticket');
        
        // Validate ticket
        const result = await this.auth.validateTicket(ticket);
        
        if (!result) {
          return new Response('Invalid or expired ticket', { 
            status: 401,
            headers: this.getCorsHeaders(),
          });
        }

        // Upgrade to WebSocket with authenticated user
        const success = server.upgrade(req, {
          data: {
            userId: result.userId,
            socketId: crypto.randomUUID(),
            connectedAt: new Date().toISOString(),
          },
        });

        if (success) {
          return undefined as any;
        }

        return new Response('Upgrade failed', { status: 500 });
      },

      websocket: {
        open: (ws) => this.handleOpen(ws),
        message: (ws, message) => this.handleMessage(ws, message),
        close: (ws) => this.handleClose(ws),
        
        perMessageDeflate: false,
        maxPayloadLength: 1024 * 1024,
        idleTimeout: 60,
      },
    });

    logger.info({ port: this.config.port }, 'WebSocket gateway running');
  }

  private async handleOpen(ws: ServerWebSocket<WSState>) {
    const userId = ws.data.userId;
    
    if (!userId) {
      ws.close(1008, 'Invalid state');
      return;
    }

    // Add to user sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
      
      // Subscribe to user's Redis channel
      await this.redis.subscribe(`ws:user:${userId}`, (message) => {
        this.broadcastToUser(userId, message);
      });
    }
    
    this.userSockets.get(userId)!.add(ws);

    logger.info({ userId, socketId: ws.data.socketId }, 'User connected');

    // Start heartbeat
    const timer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
          event: 'heartbeat', 
          timestamp: new Date().toISOString() 
        }));
      }
    }, this.config.heartbeatInterval);
    
    this.heartbeatTimers.set(ws, timer);
  }

  private handleMessage(ws: ServerWebSocket<WSState>, message: string | Buffer) {
    try {
      const text = message.toString();
      const data = JSON.parse(text);

      if (data.event === 'ping') {
        ws.send(JSON.stringify({ 
          event: 'pong', 
          timestamp: new Date().toISOString() 
        }));
        return;
      }

      logger.info({ userId: ws.data.userId, event: data.event }, 'WebSocket message received');
    } catch (error) {
      logger.error({ err: error, userId: ws.data.userId }, 'WebSocket message error');
    }
  }

  private handleClose(ws: ServerWebSocket<WSState>) {
    const userId = ws.data.userId;
    logger.info({ userId, socketId: ws.data.socketId }, 'User disconnected');
    
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
          this.redis.unsubscribe(`ws:user:${userId}`);
        }
      }
    }

    const timer = this.heartbeatTimers.get(ws);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(ws);
    }
  }

  private broadcastToUser(userId: string, message: string) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;

    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  private getCorsHeaders(): Record<string, string> {
    return {
      'Access-Control-Allow-Origin': this.config.frontendUrl,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  async stop() {
    if (this.server) {
      this.server.stop();
    }
    await this.redis.disconnect();
  }
}
