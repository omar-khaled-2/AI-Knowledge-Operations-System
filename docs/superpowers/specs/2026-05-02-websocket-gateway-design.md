# WebSocket Gateway Design — Document Status Updates (MVP)

**Date**: 2026-05-02
**Status**: Approved
**Scope**: MVP — Document processing status updates only

---

## 1. Goal

Provide real-time document processing status updates to users via a persistent WebSocket connection that survives page navigations within the session.

## 2. Non-Goals (Future Phases)

- Chat/messaging
- Presence (online/away/typing)
- Collaboration features (cursors, live editing)
- System notifications
- Multi-room subscriptions

## 3. Event Schema (MVP)

```typescript
interface WSMessage<T extends WSEventType, P> {
  event: T;
  version: '1.0';
  timestamp: string;  // ISO 8601
  userId: string;     // target receiver
  payload: P;
}

type WSEventType = 'document.status';

interface DocumentStatusPayload {
  documentId: string;
  status: 'uploaded' | 'processing' | 'chunking' | 'embedding' | 'ready' | 'error';
  progress?: number;   // 0-100, optional
  error?: string;      // present only when status === 'error'
}
```

### Example Events

**Processing update**:
```json
{
  "event": "document.status",
  "version": "1.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "userId": "user_123",
  "payload": {
    "documentId": "doc_456",
    "status": "processing",
    "progress": 45
  }
}
```

**Completed**:
```json
{
  "event": "document.status",
  "version": "1.0",
  "timestamp": "2024-01-15T10:35:00Z",
  "userId": "user_123",
  "payload": {
    "documentId": "doc_456",
    "status": "ready"
  }
}
```

**Error**:
```json
{
  "event": "document.status",
  "version": "1.0",
  "timestamp": "2024-01-15T10:32:00Z",
  "userId": "user_123",
  "payload": {
    "documentId": "doc_456",
    "status": "error",
    "error": "Failed to parse PDF: corrupted file"
  }
}
```

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js App Router)            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RootLayout (app/layout.tsx)                         │  │
│  │  ├─ WebSocketProvider (React Context)               │  │
│  │  │   ├─ Single WS connection for entire session     │  │
│  │  │   ├─ Auto-reconnect with backoff                 │  │
│  │  │   ├─ Heartbeat ping/pong (30s interval)          │  │
│  │  │   └─ Event dispatch to subscribers               │  │
│  │  │                                                  │  │
│  │  └─ Page Content                                    │  │
│  │      └─ DocumentStatusIndicator (uses useWSEvent)   │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ wss://api.example.com/ws
                           │ (Better-Auth session cookie)
┌──────────────────────────▼──────────────────────────────────┐
│                    BACKEND (NestJS + Bun)                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WebSocketGateway                                    │  │
│  │  ├─ handleConnection()                               │  │
│  │  │   └─ Validate Better-Auth session from cookie     │  │
│  │  │   └─ Store socket mapping in Redis               │  │
│  │  ├─ handleDisconnect()                               │  │
│  │  │   └─ Clean up Redis entries                      │  │
│  │  ├─ @SubscribeMessage('ping')                        │  │
│  │  │   └─ Refresh Redis TTL, respond pong             │  │
│  │  └─ Redis subscriber                                 │  │
│  │      └─ Forward messages to matching sockets        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WebSocketPublisher (Injectable Service)             │  │
│  │  ├─ sendToUser(userId, event) ──► Redis PUBLISH     │  │
│  │  └─ Used by: DocumentsService, any module           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DocumentsService                                    │  │
│  │  └─ On document status update:                      │  │
│  │      wsPublisher.sendToUser(ownerId, {              │  │
│  │        event: 'document.status', ...                │  │
│  │      })                                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Single Connection**: One WebSocket per user session, created at app root level, persists across client-side navigations.
2. **Decoupled Publishing**: Any module can publish events via `WebSocketPublisher` without knowing about WebSocket internals.
3. **Redis for Scale**: Redis pub/sub enables multi-instance backends. Single instance works without Redis (fallback to in-memory).

## 5. Authentication Flow

```
User Logs In (Better-Auth)
    │
    ▼
Session cookie stored (better-auth.session_token)
    │
    ▼
App mounts → WebSocketProvider initiates connection
    │
    ▼
WS Handshake includes cookie header
    │
    ▼
Gateway extracts & validates token via Better-Auth
    │
    ▼
Valid? ──Yes──► Store in Redis:
                HSET ws:sockets:{socketId} userId {userId}
                SADD ws:user:{userId} {socketId}
                EXPIRE ws:sockets:{socketId} 300
    │
    No
    ▼
Close connection (code 1008 Policy Violation)
```

**Session Refresh**: Heartbeat ping every 30s refreshes Redis TTL. If session expires, next ping fails validation → connection closed → frontend redirects to /signin.

## 6. Redis Data Model

```
# Socket → User mapping (Hash, TTL 5min)
HSET ws:sockets:{socketId} userId "user_123" connectedAt "2024-01-15T10:00:00Z"
EXPIRE ws:sockets:{socketId} 300

# User → Sockets index (Set)
SADD ws:user:user_123 socketId_abc socketId_def

# Pub/Sub Channels
PUBLISH ws:user:user_123 {event_json}   # Direct to user
```

## 7. Backend Components

### 7.1 WebSocketGateway (`src/websocket/websocket.gateway.ts`)

Responsibilities:
- Accept WebSocket connections on `/ws` endpoint
- Authenticate via Better-Auth session cookie
- Maintain socket ↔ user mapping in Redis
- Subscribe to Redis `ws:user:{userId}` channel
- Forward received messages to the socket
- Handle heartbeat ping/pong
- Clean up on disconnect

### 7.2 WebSocketPublisher (`src/websocket/websocket-publisher.service.ts`)

Interface:
```typescript
@Injectable()
class WebSocketPublisher {
  async sendToUser(userId: string, event: WSMessage): Promise<void>;
}
```

Implementation:
- Serializes event to JSON
- Publishes to Redis channel `ws:user:{userId}`
- If Redis unavailable, falls back to in-memory socket lookup (single instance)

### 7.3 RedisService (`src/websocket/redis.service.ts`)

Responsibilities:
- Manage Redis client connections (publisher + subscriber)
- Handle connection errors and reconnection
- Provide typed pub/sub methods

## 8. Frontend Components

### 8.1 WebSocketProvider (`frontend/providers/websocket-provider.tsx`)

A React Context provider mounted in the root layout:

```typescript
interface WebSocketContextType {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastMessage: WSMessage | null;
  send: (message: WSMessage) => void;
}
```

Behavior:
- **Mount**: Immediately attempt connection if user is authenticated
- **Auth change**: If user logs in → connect. If logs out → disconnect.
- **Page navigation**: Connection persists (React Context survives route changes in App Router)
- **Auto-reconnect**: Exponential backoff (1s → 2s → 4s → ... → max 30s)
- **Heartbeat**: Send ping every 30s, expect pong within 5s
- **Event dispatch**: Maintain internal subscriber registry, dispatch events to registered listeners

### 8.2 useWebSocket Hook (`frontend/hooks/use-websocket.ts`)

```typescript
function useWebSocket(): WebSocketContextType;
```

Access the WebSocket context. Used by components that need connection status or want to send messages.

### 8.3 useWebSocketEvent Hook (`frontend/hooks/use-websocket-event.ts`)

```typescript
function useWebSocketEvent<T = DocumentStatusPayload>(
  eventType: WSEventType
): T | null;
```

Subscribe to a specific event type. Returns the latest payload of that event type.

### 8.4 DocumentStatus Component

```typescript
function DocumentStatusIndicator({ documentId }: { documentId: string }) {
  const status = useDocumentStatus(documentId); // Uses useWebSocketEvent internally

  return (
    <div>
      {status === 'processing' && <ProgressBar progress={status.progress} />}
      {status === 'ready' && <CheckIcon />}
      {status === 'error' && <ErrorIcon message={status.error} />}
    </div>
  );
}
```

## 9. Data Flow: Document Processing Status

```
1. User uploads document via frontend
   │
   ▼
2. POST /api/documents → DocumentsController
   │
   ▼
3. DocumentsService.create() → save to DB
   │   emit('document.created') → RabbitMQ (existing flow)
   │
   ▼
4. DocumentProcessor Worker (Python) picks up job
   │   Processes: parse → chunk → embed → store
   │
   ▼
5. Worker calls BACKEND_URL/api/documents/{id}/status
   │   (existing status callback mechanism)
   │
   ▼
6. DocumentsController.updateStatus()
   │   Updates document in DB
   │   Calls WebSocketPublisher.sendToUser(ownerId, event)
   │
   ▼
7. WebSocketPublisher → Redis PUBLISH ws:user:{userId}
   │
   ▼
8. WebSocketGateway (all instances) receive message
   │   Instance with matching socket forwards to client
   │
   ▼
9. Frontend WebSocketProvider receives event
   │   Dispatches to useWebSocketEvent('document.status') subscribers
   │
   ▼
10. DocumentStatusIndicator re-renders with new status
```

## 10. Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| **User not authenticated** | WebSocketProvider does not attempt connection. Shows "offline" status. |
| **Auth failure on connect** | Close with 1008. Frontend shows error toast. |
| **Session expires mid-session** | Next heartbeat fails → close 1008 → frontend redirects to /signin. |
| **Server restart** | Client detects close → auto-reconnect with backoff. |
| **Redis unavailable** | Gateway falls back to in-memory socket map. Publisher logs warning. |
| **Client offline > 5min** | Redis TTL expires. Server cleans up stale sockets. |
| **Message parse error** | Log error, ignore malformed message. Do not crash connection. |
| **User opens multiple tabs** | Each tab has its own socket. All receive events via Redis pub/sub. |

## 11. API Changes

### New Dependencies

**Backend** (`backend/package.json`):
```json
{
  "@nestjs/websockets": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "ioredis": "^5.0.0",
  "socket.io": "^4.0.0"
}
```

**Frontend** (`frontend/package.json`):
```json
{
  "socket.io-client": "^4.0.0"
}
```

### New Environment Variables

```bash
# .env (backend)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=           # optional
WS_HEARTBEAT_INTERVAL=30000  # ms
WS_REDIS_TTL=300             # seconds
```

## 12. Testing Strategy

### Backend

1. **Unit**: `WebSocketPublisher` — mock Redis, verify publish called with correct channel
2. **Unit**: `WebSocketGateway` — mock socket, verify auth validation, Redis calls
3. **Integration**: Connect with valid/invalid session, verify connection accepted/rejected
4. **Integration**: Publish event, verify message received by connected client
5. **E2E**: Upload document → verify WS status updates through full pipeline

### Frontend

1. **Unit**: `useWebSocket` — mock WebSocket, verify reconnect logic
2. **Unit**: `WebSocketProvider` — verify context value, connection lifecycle
3. **Integration**: DocumentStatus component receives WS event → UI updates
4. **E2E**: Login → upload document → see real-time status bar update

## 13. Future Extensibility

The architecture supports adding new event types without breaking changes:

1. Add new event type to `WSEventType` union
2. Define payload interface
3. Publisher calls `sendToUser()` or new `broadcastToRoom()` method
4. Frontend uses `useWebSocketEvent('new.event.type')`

Room-based features (chat, collaboration) can be added by:
1. Adding `join.room` / `leave.room` message handlers in gateway
2. Adding `ws:room:{roomId}` Redis channels
3. Adding `broadcastToRoom()` method to publisher

## 14. Open Questions

- Should we add a `reconnect` event type so frontend can re-fetch state after reconnection?
- Should we batch rapid status updates (e.g., progress 1%, 2%, 3%...) or throttle them?
- Do we need a "message acknowledged" pattern for critical updates?

---

**Next Step**: Transition to implementation plan via `writing-plans` skill.
