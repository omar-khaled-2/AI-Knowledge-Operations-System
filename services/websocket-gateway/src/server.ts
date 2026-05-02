import type { ServerWebSocket } from 'bun';
import type { ServerConfig } from './types';
import { RedisClient } from './redis';
import { AuthService } from './auth';

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

        // Validate auth before upgrade
        const cookie = req.headers.get('cookie');
        const result = await this.auth.validateSession(cookie || undefined);

        if (!result) {
          return new Response('Authentication required', { 
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

    console.log(`[Server] WebSocket gateway running on port ${this.config.port}`);
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

    console.log(`[WS] User ${userId} connected (${ws.data.socketId})`);

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

      console.log(`[WS] Message from ${ws.data.userId}:`, data.event);
    } catch (error) {
      console.error('[WS] Message error:', error);
    }
  }

  private handleClose(ws: ServerWebSocket<WSState>) {
    const userId = ws.data.userId;
    console.log(`[WS] User ${userId} disconnected (${ws.data.socketId})`);
    
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
