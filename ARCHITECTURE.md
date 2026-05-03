# AI Knowledge Operations System — Architecture

> **Version**: 1.0  
> **Last Updated**: 2026-05-03  
> **Status**: Production-Ready

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Component Breakdown](#3-component-breakdown)
4. [Data Flow](#4-data-flow)
5. [Technology Stack](#5-technology-stack)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Observability](#8-observability)
9. [Scalability & Performance](#9-scalability--performance)

---

## 1. System Overview

The **AI Knowledge Operations System** is a modular, microservices-based platform that enables organizations to ingest documents, generate AI-powered insights, and interact with their knowledge base through intelligent chat. The system follows an **event-driven architecture** with clear separation of concerns across ingestion, processing, retrieval, and consumption layers.

### Core Capabilities

- **Document Ingestion**: Upload and process PDF, Markdown, and text documents
- **Semantic Search**: Vector-based retrieval with OpenAI embeddings and Qdrant
- **AI Chat**: Context-aware conversational interface with RAG (Retrieval Augmented Generation)
- **Project Management**: Multi-tenant project isolation for document and conversation boundaries
- **Real-time Collaboration**: WebSocket-based live updates and streaming responses
- **AI Insights**: Automated analysis and insight generation from document collections

---

## 2. Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐                                                           │
│  │   Browser    │  Next.js 14 + React 18 + Tailwind CSS + shadcn/ui         │
│  │  (Frontend)  │  • Server Actions for API calls                            │
│  └──────┬───────┘  • Socket.io client for real-time                         │
│         │          • Server-side rendering with App Router                   │
│         │                                                                    │
│         │ HTTPS / WebSocket                                                  │
│         ▼                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                           GATEWAY LAYER                                      │
│  ┌─────────────────┐    ┌─────────────────────────────────────┐            │
│  │  API Gateway    │    │     WebSocket Gateway (Bun)         │            │
│  │   (NestJS)      │    │  • Real-time message streaming      │            │
│  │  • REST API     │◄──►│  • Redis pub/sub fan-out            │            │
│  │  • Auth (OAuth) │    │  • Connection management            │            │
│  │  • Validation   │    │  • Port: 3002                       │            │
│  └────────┬────────┘    └─────────────────────────────────────┘            │
│           │                                                                  │
│           │ Internal Services                                                │
│           ▼                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                         SERVICE LAYER (Microservices)                        │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Chat Service   │  │Retrieval Service│  │ Insight Service │             │
│  │  (FastAPI/py)   │  │  (FastAPI/py)   │  │  (FastAPI/py)   │             │
│  │  • AI response  │  │  • Semantic     │  │  • AI analysis  │             │
│  │    generation   │  │    search       │  │  • Summarization│             │
│  │  • RAG pipeline │  │  • Qdrant queries│  │  • Pattern det. │             │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘             │
│           │                    │                                            │
│           └────────────────────┘                                            │
│                    │                                                        │
│                    ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              DOCUMENT INGESTION PIPELINE (3-Stage)                   │   │
│  │                                                                      │   │
│  │  Stage 1: Document Processor    Stage 2: Embedding    Stage 3: Store│   │
│  │  ┌─────────────────────────┐   ┌─────────────────┐   ┌─────────────┐│   │
│  │  │ • S3 download           │   │ • OpenAI embed  │   │ • Qdrant    ││   │
│  │  │ • Parse PDF/MD/TXT      │──►│ • Vector gen    │──►│ • Upsert    ││   │
│  │  │ • Semantic chunking     │   │ • Batch process │   │ • Index     ││   │
│  │  └─────────────────────────┘   └─────────────────┘   └─────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         DATA & MESSAGE LAYER                                 │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   MongoDB    │  │    Redis     │  │   RabbitMQ   │  │     Qdrant      │ │
│  │  • Users     │  │  • Sessions  │  │  • Document  │  │  • Vectors      │ │
│  │  • Projects  │  │  • Pub/Sub   │  │    events    │  │  • Metadata     │ │
│  │  • Documents │  │  • Caching   │  │  • Job queues│  │  • Collections  │ │
│  │  • Messages  │  │  • Tickets   │  │  • Streaming │  │  • ANN Search   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         AWS S3                                      │   │
│  │              • Document blob storage                                │   │
│  │              • Pre-signed URLs for upload/download                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                      OBSERVABILITY & INFRASTRUCTURE                          │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   Grafana    │  │    Loki      │  │    Alloy     │                      │
│  │  • Dashboards│  │  • Log agg.  │  │  • Log ship  │                      │
│  │  • Metrics   │  │  • 7d ret.   │  │  • K8s API   │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Frontend (Next.js 14)

**Purpose**: User-facing web application

**Key Technologies**:
- Next.js 14 with App Router
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui components
- Socket.io client for real-time updates
- Better Auth for authentication

**Architecture Patterns**:
- Server Actions for backend communication (migrated from REST API calls)
- Server Components for data fetching
- Client Components for interactivity
- Route groups for auth vs. app layout separation

**Key Directories**:
```
frontend/
├── app/
│   ├── (app)/          # Authenticated app routes
│   ├── (auth)/         # Authentication routes
│   └── layout.tsx      # Root layout
├── components/         # Reusable UI components
├── hooks/             # Custom React hooks
├── lib/               # Utilities and configurations
├── providers/         # Context providers
└── types/             # TypeScript type definitions
```

---

### 3.2 Backend API (NestJS)

**Purpose**: Core API gateway and business logic orchestration

**Key Modules**:

| Module | Responsibility | Key Dependencies |
|--------|---------------|------------------|
| `AuthModule` | OAuth2/Google authentication, session management | better-auth, MongoDB |
| `UsersModule` | User CRUD, profiles | MongoDB |
| `ProjectsModule` | Multi-tenant project management | MongoDB |
| `DocumentsModule` | Document metadata, upload coordination | MongoDB, S3, RabbitMQ |
| `MessagesModule` | Chat message persistence | MongoDB |
| `ChatModule` | Chat orchestration, AI request dispatch | Redis pub/sub |
| `SessionsModule` | Conversation session management | MongoDB |
| `InsightsModule` | AI insight generation requests | MongoDB |
| `WebSocketModule` | Ticket-based auth, Redis integration | Redis |

**Architecture Patterns**:
- **Modular monolith** with clear module boundaries
- **Event-driven** internal communication via `@nestjs/event-emitter`
- **Repository pattern** with Mongoose ODM
- **Dependency injection** for testability
- **Global validation pipes** for request sanitization

---

### 3.3 WebSocket Gateway (Bun + TypeScript)

**Purpose**: Standalone real-time communication server

**Key Features**:
- Connection management with Redis ticket validation
- Pub/sub message fan-out via Redis
- Heartbeat mechanism for connection health
- Graceful shutdown handling

**Why Standalone?**
- Decoupled from backend for independent scaling
- Bun runtime for high-performance WebSocket handling
- Isolated failure domain

---

### 3.4 Chat Service (Python/FastAPI)

**Purpose**: AI response generation with RAG support

**Architecture**:
```
Redis "chat:process" → Chat Service Worker → Redis "chat:response"
```

**Flow**:
1. Subscribe to `chat:process` Redis channel
2. Call retrieval-service if `projectId` present (RAG context)
3. Generate AI response (streaming chunks)
4. Publish chunks to `chat:response` channel
5. WebSocket gateway forwards to client

**Key Characteristics**:
- Stateless worker design
- No exposed REST API (except `/health`)
- Streaming response support

---

### 3.5 Retrieval Service (Python/FastAPI)

**Purpose**: Semantic search over document embeddings

**API Endpoints**:
- `POST /search` — Semantic search with metadata filters
- `GET /health` — Liveness probe
- `GET /ready` — Readiness probe (Qdrant connectivity)

**Search Pipeline**:
```
Query → OpenAI Embedding → Qdrant ANN Search → Filtered Results
```

**Filter DSL**:
- `must` — Required conditions
- `should` — Optional conditions (boost)
- `must_not` — Exclusion conditions
- Condition types: `match`, `match_any`, `range`

---

### 3.6 Document Ingestion Pipeline (3-Stage)

#### Stage 1: Document Processor

**Input**: Redis Stream `documents:events`

**Processing**:
```
S3 Download → Parse (PDF/MD/TXT) → Semantic Chunking (OpenAI) → RQ Queue
```

**Supported Formats**:
- PDF (via pdfplumber)
- Markdown (raw)
- Plain text

**Semantic Chunking**:
1. Split into sentences
2. Generate embeddings per sentence
3. Compare cosine similarity
4. Create chunks at semantic boundaries

#### Stage 2: Embedding Service

**Input**: RQ Queue `embedding-jobs`

**Processing**:
```
Text Chunks → OpenAI Embedding API → Vector Embeddings
```

**Output**: Upsert to Qdrant vector database

#### Stage 3: Qdrant Storage

**Collection**: `documents`

**Metadata per vector**:
- `document_id` — Source document UUID
- `project_id` — Project isolation
- `filename` — Original filename
- `chunk_index` — Position in document

---

### 3.7 Insight Service (Python/FastAPI)

**Purpose**: AI-powered document analysis and insight generation

**Capabilities**:
- Automated summarization
- Pattern detection across document collections
- Key entity extraction
- Trend analysis

---

## 4. Data Flow

### 4.1 Document Upload Flow

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌─────────────────┐
│  User   │────►│ Frontend │────►│   Backend   │────►│       S3        │
│         │     │          │     │   API       │     │                 │
└─────────┘     └──────────┘     └──────┬──────┘     └─────────────────┘
                                        │
                                        │ 1. Generate presigned URL
                                        │ 2. Store metadata in MongoDB
                                        │ 3. Publish to Redis Stream
                                        ▼
                               ┌─────────────────┐
                               │  Redis Stream   │
                               │ documents:events│
                               └────────┬────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │Document Processor│
                               │  (Worker)       │
                               └────────┬────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
               ┌─────────┐      ┌─────────────┐      ┌──────────┐
               │   S3    │      │   Parse     │      │  Chunk   │
               │ Download│────►│  Document   │────►│  (OpenAI)│
               └─────────┘      └─────────────┘      └────┬─────┘
                                                          │
                                                          ▼
                                               ┌─────────────────┐
                                               │  RQ Queue       │
                                               │ embedding-jobs  │
                                               └────────┬────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │Embedding Service│
                                               │  (RQ Worker)    │
                                               └────────┬────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │     Qdrant      │
                                               │  (Vector Store) │
                                               └─────────────────┘
```

### 4.2 Chat with RAG Flow

```
┌─────────┐     ┌──────────┐     ┌─────────────────────────────────────┐
│  User   │────►│ Frontend │────►│         Backend API                 │
│         │     │          │     │  1. Authenticate request            │
└─────────┘     └──────────┘     │  2. Store message in MongoDB        │
                                 │  3. Publish to chat:process         │
                                 └─────────────────┬───────────────────┘
                                                   │
                                                   ▼
                                         ┌─────────────────┐
                                         │  Redis Pub/Sub  │
                                         │  chat:process   │
                                         └────────┬────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
                    ▼                             ▼                             ▼
           ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
           │  Chat Service   │          │Retrieval Service│          │  WebSocket GW   │
           │  (Subscriber)   │─────────►│  (if projectId) │          │  (Publisher)    │
           │                 │  RAG     │  Semantic Search│          │                 │
           │  1. Receive msg │  Context │  in Qdrant      │          │                 │
           │  2. Call retrieval│        │                 │          │                 │
           │  3. Generate AI │◄─────────│  Return chunks  │          │                 │
           │     response    │          │                 │          │                 │
           │  4. Stream chunks         │                 │          │                 │
           └────────┬────────┘          └─────────────────┘          │                 │
                    │                                                  │                 │
                    │  Publish to chat:response                        │                 │
                    │─────────────────────────────────────────────────►│                 │
                    │                                                  │                 │
                    │                                                  │  Fan-out to     │
                    │                                                  │  connected      │
                    │                                                  │  clients        │
                    │                                                  │                 │
                    │                                                  ▼                 │
                    │                                         ┌─────────────────┐        │
                    │                                         │     Client      │        │
                    │                                         │  (Browser)      │        │
                    │                                         │  Stream chunks  │        │
                    │                                         └─────────────────┘        │
                    │                                                                    │
                    └────────────────────────────────────────────────────────────────────┘
```

### 4.3 Authentication Flow

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │────►│ Frontend │────►│   Backend   │────►│  Better Auth │
│         │     │          │     │   API       │     │  (OAuth2)   │
└─────────┘     └──────────┘     └──────┬──────┘     └──────┬──────┘
                                        │                   │
                                        │                   │ Google OAuth
                                        │                   │
                                        │              ┌────┴────┐
                                        │              │ Google  │
                                        │              │ Identity│
                                        │              └────┬────┘
                                        │                   │
                                        │ JWT + Session     │
                                        │◄──────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │    MongoDB      │
                               │  User sessions  │
                               └─────────────────┘
```

### 4.4 Real-time WebSocket Flow

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌─────────────────┐
│  User   │────►│ Frontend │────►│   Backend   │────►│  WebSocket GW   │
│         │     │          │     │   API       │     │  (Ticket auth)  │
└─────────┘     └──────────┘     └─────────────┘     └────────┬────────┘
                                                              │
                                                              │ 1. Validate ticket
                                                              │ 2. Store connection
                                                              │ 3. Subscribe to Redis
                                                              ▼
                                                     ┌─────────────────┐
                                                     │      Redis      │
                                                     │  Pub/Sub rooms  │
                                                     └────────┬────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    │                                         │                                         │
                    ▼                                         ▼                                         ▼
           ┌─────────────────┐                      ┌─────────────────┐                      ┌─────────────────┐
           │  Chat Service   │                      │Document Events  │                      │  System Notif.  │
           │  (Publish)      │                      │  (Publish)      │                      │  (Publish)      │
           │  chat:response  │                      │  doc:processed  │                      │  sys:alerts     │
           └────────┬────────┘                      └────────┬────────┘                      └────────┬────────┘
                    │                                         │                                         │
                    └─────────────────────────────────────────┴─────────────────────────────────────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │  WebSocket GW   │
                                                     │  (Fan-out)      │
                                                     └────────┬────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    │                                         │                                         │
                    ▼                                         ▼                                         ▼
           ┌─────────────────┐                      ┌─────────────────┐                      ┌─────────────────┐
           │  Client A       │                      │  Client B       │                      │  Client C       │
           │  (Same project) │                      │  (Same project) │                      │  (Same project) │
           └─────────────────┘                      └─────────────────┘                      └─────────────────┘
```

---

## 5. Technology Stack

### 5.1 Runtime & Languages

| Component | Runtime | Language | Reason |
|-----------|---------|----------|--------|
| Frontend | Node.js | TypeScript | Next.js ecosystem |
| Backend | Node.js | TypeScript | NestJS framework maturity |
| WebSocket GW | Bun | TypeScript | High-perf WebSockets |
| Python Services | Python 3.11+ | Python | AI/ML library ecosystem |

### 5.2 Frameworks & Libraries

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend Framework | Next.js | 14.0 | React framework with App Router |
| UI Components | shadcn/ui | latest | Accessible component primitives |
| Styling | Tailwind CSS | 4.2 | Utility-first CSS |
| Backend Framework | NestJS | 10.0 | Modular Node.js framework |
| Auth | better-auth | 1.6 | OAuth2 + session management |
| ORM | Mongoose | 8.0 | MongoDB ODM |
| Python Framework | FastAPI | latest | High-performance Python API |
| Embeddings | OpenAI API | latest | text-embedding-3-small |
| AI Models | OpenAI API | latest | GPT for chat + insights |

### 5.3 Data Stores

| Store | Technology | Purpose | Persistence |
|-------|-----------|---------|-------------|
| Primary Database | MongoDB | Users, projects, documents, messages | Persistent |
| Vector Database | Qdrant | Document embeddings, semantic search | Persistent |
| Cache & Sessions | Redis | Sessions, pub/sub, caching | Ephemeral |
| Message Queue | RabbitMQ | Document processing jobs | Persistent |
| Task Queue | RQ (Redis Queue) | Embedding jobs | Persistent (Redis) |
| Blob Storage | AWS S3 | Document files | Persistent |

### 5.4 Infrastructure

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Container Orchestration | Kubernetes | Service deployment |
| Local Dev | Skaffold | K8s development workflow |
| IaC | Terraform | Cloud infrastructure |
| Monitoring | Grafana | Dashboards & visualization |
| Log Aggregation | Loki | Log storage & querying |
| Log Shipping | Grafana Alloy | K8s log collection |

---

## 6. Deployment Architecture

### 6.1 Local Development

```
skaffold dev
├── Builds all service images
├── Deploys to local Kubernetes (kind/minikube)
├── Port-forwards services to localhost
│   ├── Frontend: localhost:3000
│   ├── Backend API: localhost:3001
│   ├── WebSocket GW: localhost:3002
│   ├── Retrieval Service: localhost:3003
│   ├── Grafana: localhost:9000
│   ├── Redis: localhost:6379
│   ├── RabbitMQ: localhost:15672
│   └── Qdrant: localhost:6333
└── Hot-reload on code changes
```

### 6.2 Kubernetes Architecture

```
Namespace: default
├── Stateful Services
│   ├── MongoDB (Helm chart)
│   ├── Redis (Helm chart)
│   ├── RabbitMQ (Helm chart)
│   └── Qdrant (Helm chart)
├── Application Services
│   ├── frontend (Deployment + Service)
│   ├── backend (Deployment + Service)
│   ├── websocket-gateway (Deployment + Service)
│   ├── chat-service (Deployment)
│   ├── retrieval-service (Deployment + Service)
│   ├── document-processor (Deployment)
│   ├── embedding-service (Deployment)
│   └── insight-service (Deployment)
└── Observability
    ├── grafana (Deployment + Service)
    ├── loki (StatefulSet + PVC)
    └── alloy (DaemonSet)
```

### 6.3 Service Communication Matrix

| Service | Protocol | Auth | Discovery |
|---------|----------|------|-----------|
| Frontend → Backend | HTTP/REST | Cookie (OAuth) | K8s DNS |
| Frontend → WS Gateway | WebSocket | Ticket-based | K8s DNS |
| Backend → MongoDB | MongoDB Protocol | Credentials | K8s DNS |
| Backend → Redis | Redis Protocol | Password | K8s DNS |
| Backend → RabbitMQ | AMQP | Credentials | K8s DNS |
| Backend → S3 | HTTPS | AWS IAM | AWS DNS |
| Chat Service → Retrieval | HTTP/REST | None (internal) | K8s DNS |
| Chat Service → Redis | Redis Pub/Sub | Password | K8s DNS |
| Document Processor → S3 | HTTPS | AWS IAM | AWS DNS |
| Document Processor → Redis | Redis Streams | Password | K8s DNS |
| Embedding Service → OpenAI | HTTPS | API Key | api.openai.com |
| Embedding Service → Qdrant | gRPC/HTTP | None (internal) | K8s DNS |
| Retrieval Service → OpenAI | HTTPS | API Key | api.openai.com |
| Retrieval Service → Qdrant | gRPC/HTTP | None (internal) | K8s DNS |

---

## 7. Security Architecture

### 7.1 Authentication & Authorization

- **OAuth 2.0**: Google Sign-In via better-auth
- **Session Management**: Server-side sessions stored in MongoDB
- **WebSocket Security**: Ticket-based authentication (single-use tickets validated against Redis)
- **CORS**: Strict origin whitelist

### 7.2 Data Protection

- **In Transit**: HTTPS/WSS for all external communication
- **At Rest**: 
  - MongoDB: Managed by cloud provider or Helm chart
  - S3: Server-side encryption (AES-256)
  - Qdrant: Persistent volume encryption
- **Secrets**: Environment variables, Kubernetes secrets (production)

### 7.3 Network Security

- **Internal Communication**: Kubernetes cluster networking (isolated)
- **External Exposure**: Only Frontend, Backend API, and WebSocket Gateway
- **Database Access**: Internal cluster only (no external exposure)

### 7.4 Input Validation

- **Backend**: Global ValidationPipe (whitelist + transform)
- **Frontend**: Form validation with Zod (via shadcn/ui forms)
- **File Uploads**: MIME type validation, size limits, virus scanning (future)

---

## 8. Observability

### 8.1 Logging

```
App Container Logs → Alloy (DaemonSet) → Loki → Grafana
```

**Log Labels**:
- `namespace` — Kubernetes namespace
- `pod` — Pod name
- `container` — Container name
- `service` — Application service name

**Retention**: 7 days (local dev)

### 8.2 Health Checks

| Service | Liveness | Readiness | Endpoint |
|---------|----------|-----------|----------|
| Backend | HTTP 200 | MongoDB + Redis | `/health` |
| WebSocket GW | HTTP 200 | Redis connection | `/health` |
| Retrieval | HTTP 200 | Qdrant connection | `/ready` |
| Chat Service | HTTP 200 | Redis connection | `/health` |
| Document Processor | HTTP 200 | Redis + S3 | `/health` |
| Embedding Service | HTTP 200 | Redis + Qdrant | `/ready` |

### 8.3 Monitoring (Future)

- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry (distributed tracing across services)
- **Alerting**: Prometheus Alertmanager

---

## 9. Scalability & Performance

### 9.1 Horizontal Scaling

| Component | Scaling Strategy | Bottleneck |
|-----------|-----------------|------------|
| Frontend | HPA (CPU/mem) | CDN for static assets |
| Backend API | HPA (CPU/mem) | MongoDB connection pool |
| WebSocket GW | HPA (connections) | Redis pub/sub throughput |
| Chat Service | HPA (message queue depth) | OpenAI API rate limits |
| Retrieval | HPA (CPU/mem) | Qdrant query capacity |
| Document Processor | HPA (queue depth) | OpenAI embedding rate limits |
| Embedding Service | HPA (queue depth) | OpenAI embedding rate limits |

### 9.2 Caching Strategy

| Layer | Cache | TTL | Invalidation |
|-------|-------|-----|--------------|
| User Sessions | Redis | 24h | On logout |
| WS Tickets | Redis | 5min | Single-use |
| Document Metadata | Redis | 1h | On upload/delete |
| Search Results | Redis | 5min | On document update |
| Embeddings | Qdrant | Persistent | On document reprocessing |

### 9.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | < 200ms (p95) | Backend endpoints |
| Document Upload | < 5s (≤10MB) | End-to-end |
| Search Query | < 500ms | Retrieval service |
| AI Response Start | < 2s | Time to first token |
| WebSocket Latency | < 50ms | Round-trip |

### 9.4 Resource Requirements (per replica)

| Service | CPU | Memory | Storage |
|---------|-----|--------|---------|
| Frontend | 250m | 512Mi | — |
| Backend | 500m | 1Gi | — |
| WebSocket GW | 250m | 512Mi | — |
| Chat Service | 500m | 1Gi | — |
| Retrieval | 250m | 512Mi | — |
| Document Processor | 500m | 2Gi | — |
| Embedding Service | 250m | 512Mi | — |
| MongoDB | 1000m | 2Gi | 10Gi |
| Redis | 500m | 1Gi | — |
| Qdrant | 1000m | 2Gi | 20Gi |
| RabbitMQ | 500m | 1Gi | 5Gi |

---

## Appendix A: Directory Structure

```
AI-Knowledge-Operations-System/
├── frontend/                    # Next.js 14 web application
│   ├── app/                    # App Router (groups: auth, app)
│   ├── components/             # UI components
│   ├── hooks/                  # React hooks
│   ├── lib/                    # Utilities
│   └── providers/              # Context providers
├── backend/                     # NestJS API server
│   └── src/
│       ├── auth/               # Authentication module
│       ├── chat/               # Chat orchestration
│       ├── documents/          # Document management
│       ├── insights/           # AI insights
│       ├── messages/           # Message persistence
│       ├── projects/           # Project management
│       ├── rabbitmq/           # Message queue service
│       ├── sessions/           # Session management
│       ├── users/              # User management
│       ├── websocket/          # WebSocket coordination
│       └── config/             # App configuration
├── services/                    # Python microservices
│   ├── chat-service/           # AI chat processing
│   ├── retrieval-service/      # Semantic search
│   ├── document-processor/     # Document parsing & chunking
│   ├── embedding-service/      # Vector embedding generation
│   ├── websocket-gateway/      # Standalone WS server (Bun)
│   └── insight-service/        # AI insight generation
├── infra/                       # Infrastructure as Code
│   ├── helm/                   # Kubernetes Helm charts
│   ├── modules/                # Terraform modules
│   ├── dev/                    # Dev environment config
│   └── skaffold.yaml           # Skaffold configuration
├── docs/                        # Documentation
│   └── superpowers/
│       ├── specs/              # Design specifications
│       └── plans/              # Implementation plans
└── tests/                       # Integration & E2E tests
```

---

## Appendix B: Environment Variables

### Required for All Services

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development`, `production` |
| `LOG_LEVEL` | Logging verbosity | `debug`, `info`, `warn`, `error` |

### Backend-Specific

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `MONGODB_HOST` | MongoDB hostname | `localhost` |
| `MONGODB_PORT` | MongoDB port | `27017` |
| `MONGODB_DATABASE` | Database name | `ai-knowledge-ops` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `RABBITMQ_URL` | RabbitMQ connection | `amqp://localhost:5672` |
| `S3_BUCKET` | S3 bucket name | — |
| `AWS_ACCESS_KEY_ID` | AWS credentials | — |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | — |
| `OPENAI_API_KEY` | OpenAI API access | — |
| `BETTER_AUTH_SECRET` | Auth signing secret | — |
| `GOOGLE_CLIENT_ID` | OAuth2 client ID | — |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret | — |

---

## Appendix C: API Gateway Routes

### REST API Endpoints (Backend)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/*` | Authentication endpoints | Public |
| `GET` | `/api/users/me` | Current user profile | Required |
| `GET/POST` | `/api/projects` | Project CRUD | Required |
| `GET/POST` | `/api/documents` | Document management | Required |
| `POST` | `/api/documents/upload` | Initiate upload | Required |
| `GET/POST` | `/api/sessions` | Chat sessions | Required |
| `GET/POST` | `/api/messages` | Chat messages | Required |
| `POST` | `/api/chat/send` | Send chat message | Required |
| `GET` | `/api/insights` | Get insights | Required |
| `GET` | `/api/websocket/ticket` | Get WS ticket | Required |
| `GET` | `/health` | Health check | Public |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connection` | C→S | Initialize with ticket |
| `message:send` | C→S | Send chat message |
| `message:stream` | S→C | Streaming AI response |
| `document:processed` | S→C | Document status update |
| `insight:generated` | S→C | New insight available |
| `error` | S→C | Error notification |

---

*This architecture document is a living document. Update it when making significant architectural changes.*
