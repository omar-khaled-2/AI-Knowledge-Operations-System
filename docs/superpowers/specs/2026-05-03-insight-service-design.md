# Insight Service Design

> **Date:** 2026-05-03  
> **Status:** Approved  
> **Architecture:** Standalone Python microservice (Approach A)  
> **Trigger:** Event-driven on `document.embedded`  
> **Vector Access:** Qdrant direct  
> **Analysis Mode:** Single-pass LLM call

---

## Overview

Generate intelligent insights from uploaded documents in real-time. The system analyzes document content immediately after embedding completes, producing actionable intelligence for users.

**Happy Case Flow:**
1. User uploads document → Backend processes → Embedding completes
2. Backend emits `document.embedded` event to RabbitMQ
3. Insight Service consumes event, fetches data, calls LLM
4. Insight Service POSTs insights to Backend (`/internal/insights`)
5. Backend saves to MongoDB, emits WebSocket event
6. Frontend receives event, refetches insights list

**Total latency:** ~15-20 seconds from upload completion to insights delivered.

---

## Services

| Service | Role | Data Access |
|---------|------|-------------|
| **Backend (NestJS)** | Owns MongoDB exclusively. Exposes `/internal/insights` for service-to-service writes and `/insights` for user reads. Emits WebSocket events. | MongoDB (exclusive owner) |
| **Insight Service (Python/FastAPI)** | Pure analysis engine. Consumes RabbitMQ events, reads Qdrant directly, calls LLM, calls Backend internal API. | Qdrant (read-only), RabbitMQ (consume), OpenAI API |
| **WebSocket Gateway (Bun)** | Routes real-time events to connected clients. No business logic. | Redis (pub/sub) |

**Rule:** No service except Backend touches MongoDB.

---

## Data Flow (Happy Case)

### Step-by-Step Flow

```
User uploads "Q4-Strategy.pdf" to Project "Acme-Corp"
    ↓
[0s] Backend: Document status → "embedded"
    ↓
[0s] Backend: Publish RabbitMQ → document.embedded
    {
      "documentId": "doc-123",
      "projectId": "proj-456",
      "ownerId": "user-789",
      "filename": "Q4-Strategy.pdf",
      "mimeType": "application/pdf",
      "timestamp": "2024-01-15T10:00:00Z"
    }
    ↓ RabbitMQ
[1s] Insight Service: Consume event
    ↓
[2s] Insight Service: Fetch from Qdrant (parallel)
    ├─ A: Get all chunks for doc-123 (filter: document_id = "doc-123")
    └─ B: Search top 5 similar docs in project (project_id = "proj-456")
    ↓
[3s] Insight Service: Single LLM call
    Input: Document text + similar documents text
    Output: JSON array of insights (all 4 types)
    ↓
[8s] Insight Service: POST /internal/insights
    {
      "projectId": "proj-456",
      "sourceDocumentId": "doc-123",
      "insights": [
        {
          "type": "action-item",
          "title": "Legal team must approve section 4.2 by Friday",
          "description": "The partnership agreement draft requires legal review of liability clauses before signing.",
          "confidence": 0.92,
          "relatedDocuments": ["doc-123"]
        },
        {
          "type": "connection",
          "title": "Overlaps with Q3 partnership discussion",
          "description": "This document references the same vendor terms discussed in Q3-Strategy.pdf, suggesting a continuation of prior negotiations.",
          "confidence": 0.78,
          "relatedDocuments": ["doc-001", "doc-123"]
        }
      ]
    }
    ↓ HTTP
[9s] Backend: Save to MongoDB
    - Insert insights into `insights` collection
    - No auth check (internal endpoint)
    ↓
[10s] Backend: Publish WebSocket → insight.generated
    {
      "event": "insight.generated",
      "version": "1.0",
      "timestamp": "2024-01-15T10:00:10Z",
      "userId": "user-789",
      "payload": {
        "projectId": "proj-456",
        "sourceDocumentId": "doc-123",
        "newInsightsCount": 2,
        "preview": [
          {
            "type": "action-item",
            "title": "Legal team must approve section 4.2 by Friday",
            "confidence": 0.92
          }
        ]
      }
    }
    ↓ Redis pub/sub
[11s] WebSocket Gateway: Receive → route to user-789's socket
    ↓ WS
[12s] Frontend: Receive event
    - Show toast: "2 new insights for Q4-Strategy.pdf"
    - Invalidate insights query cache
    - Refetch GET /insights?projectId=proj-456
```

---

## MongoDB Schema

### Collection: `insights`

```typescript
// backend/src/insights/schemas/insight.schema.ts
@Schema({ timestamps: true })
export class Insight {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Document', required: true, index: true })
  sourceDocumentId: Types.ObjectId;

  @Prop({ 
    required: true, 
    enum: ['action-item', 'connection', 'trend', 'anomaly'],
    index: true 
  })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0, max: 1 })
  confidence: number;

  @Prop({ type: [Types.ObjectId], ref: 'Document', default: [] })
  relatedDocuments: Types.ObjectId[];

  @Prop({ 
    required: true, 
    enum: ['active', 'dismissed', 'resolved'],
    default: 'active',
    index: true 
  })
  status: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}
```

**Indexes:**
- `projectId + status` (filter active insights by project)
- `sourceDocumentId` (find insights for a specific document)
- `createdAt` (sort by newest)
- `type` (filter by insight category)

---

## API Contract

### 1. Internal: `POST /internal/insights`

**Caller:** Insight Service  
**Auth:** None (internal network only, Kubernetes network policy)  
**Purpose:** Persist generated insights

**Request Body:**
```json
{
  "projectId": "proj-456",
  "sourceDocumentId": "doc-123",
  "insights": [
    {
      "type": "action-item",
      "title": "Legal team must approve section 4.2 by Friday",
      "description": "The partnership agreement draft requires legal review of liability clauses before signing.",
      "confidence": 0.92,
      "relatedDocuments": ["doc-123"]
    },
    {
      "type": "connection",
      "title": "Overlaps with Q3 partnership discussion",
      "description": "This document references the same vendor terms discussed in Q3-Strategy.pdf.",
      "confidence": 0.78,
      "relatedDocuments": ["doc-001", "doc-123"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "createdCount": 2
}
```

### 2. User: `GET /insights`

**Caller:** Frontend  
**Auth:** Bearer token (AuthGuard)  
**Purpose:** List insights for a project

**Query Parameters:**
- `projectId` (required): Filter by project
- `status` (optional): Filter by `active`, `dismissed`, `resolved`
- `type` (optional): Filter by insight type
- `page` (optional): Pagination, default 1
- `limit` (optional): Page size, default 20, max 100

**Response:**
```json
{
  "data": [
    {
      "id": "ins-1",
      "projectId": "proj-456",
      "sourceDocumentId": "doc-123",
      "type": "action-item",
      "title": "Legal team must approve section 4.2 by Friday",
      "description": "The partnership agreement draft requires legal review...",
      "confidence": 0.92,
      "relatedDocuments": ["doc-123"],
      "status": "active",
      "createdAt": "2024-01-15T10:00:10Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

### 3. User: `PATCH /insights/:id/status`

**Caller:** Frontend  
**Auth:** Bearer token  
**Purpose:** Dismiss or resolve an insight

**Request Body:**
```json
{
  "status": "dismissed"
}
```

**Response:**
```json
{
  "id": "ins-1",
  "status": "dismissed",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

## RabbitMQ Events

### Published by Backend

**Exchange:** `documents` (topic)  
**Routing Key:** `document.embedded`  
**Payload:**
```json
{
  "documentId": "doc-123",
  "projectId": "proj-456",
  "ownerId": "user-789",
  "filename": "Q4-Strategy.pdf",
  "mimeType": "application/pdf",
  "size": 245000,
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### Consumed by Insight Service

The Insight Service binds to queue `insight-jobs` with routing key `document.embedded`.

---

## WebSocket Events

### Emitted by Backend

**Channel:** `ws:user:{userId}`  
**Event Type:** `insight.generated`

**Payload:**
```json
{
  "event": "insight.generated",
  "version": "1.0",
  "timestamp": "2024-01-15T10:00:10Z",
  "userId": "user-789",
  "payload": {
    "projectId": "proj-456",
    "sourceDocumentId": "doc-123",
    "newInsightsCount": 2,
    "preview": [
      {
        "type": "action-item",
        "title": "Legal team must approve section 4.2 by Friday",
        "confidence": 0.92
      }
    ]
  }
}
```

### Frontend Handling

1. Receive `insight.generated` event via WebSocket
2. Show toast notification: "{count} new insights for {filename}"
3. Invalidate React Query cache key: `["insights", projectId]`
4. Trigger refetch of `GET /insights?projectId=proj-456`

---

## LLM Prompt (Single Pass)

### System Prompt

```
You are an expert document analyst. Analyze the provided document and generate actionable insights.

Return ONLY a JSON object with this structure:
{
  "insights": [
    {
      "type": "action-item" | "connection" | "trend" | "anomaly",
      "title": "Concise 5-8 word headline",
      "description": "2-3 sentence explanation with context",
      "confidence": 0.0-1.0,
      "relatedDocuments": ["doc-id-1"]
    }
  ]
}

Rules:
- action-item: Extract follow-ups, decisions, deadlines, required approvals
- connection: Link to similar/related documents in the project
- trend: Detect shifts in topics, focus, or sentiment vs. project history
- anomaly: Flag unusual content, missing sections, or odd patterns
- Only include insights with confidence >= 0.7
- Maximum 6 insights total
- Prioritize action-items (users care most about "what do I need to do?")
- Titles should be specific, not generic
- Descriptions should explain WHY this matters
```

### User Prompt Template

```
New Document: {filename}
Project Context: {project_name} (uploaded {total_project_docs} documents in last 30 days)

Document Content:
{document_text}

Similar Documents in Project:
{similar_docs_text}

Generate insights for this new document.
```

**Variables:**
- `document_text`: Concatenated chunks from Qdrant (first 4000 tokens)
- `similar_docs_text`: Summaries of top 5 similar documents from Qdrant
- `filename`, `project_name`, `total_project_docs`: Metadata

---

## Qdrant Queries

### Query A: Get Document Chunks

```python
qdrant.scroll(
    collection_name="documents",
    scroll_filter=Filter(
        must=[
            FieldCondition(
                key="document_id",
                match=MatchValue(value="doc-123")
            )
        ]
    ),
    limit=100
)
```

### Query B: Find Similar Documents

```python
qdrant.search(
    collection_name="documents",
    query_vector=embedding_of_document_summary,
    query_filter=Filter(
        must=[
            FieldCondition(
                key="project_id",
                match=MatchValue(value="proj-456")
            )
        ],
        must_not=[
            FieldCondition(
                key="document_id",
                match=MatchValue(value="doc-123")
            )
        ]
    ),
    limit=5
)
```

---

## File Structure

### Backend

```
backend/src/insights/
├── insights.module.ts              # Module definition
├── insights.controller.ts          # GET /insights, PATCH /insights/:id/status
├── internal-insights.controller.ts # POST /internal/insights
├── insights.service.ts             # Business logic + MongoDB operations
├── schemas/
│   └── insight.schema.ts           # Mongoose schema
└── dto/
    ├── create-insight.dto.ts       # POST /internal/insights body
    ├── insight-response.dto.ts     # GET /insights response
    └── update-insight-status.dto.ts # PATCH /insights/:id/status body
```

### Insight Service

```
services/insight-service/
├── src/
│   ├── __init__.py
│   ├── app.py                      # FastAPI app + health checks
│   ├── config.py                   # Settings (RabbitMQ, Qdrant, LLM, Backend URL)
│   ├── worker.py                   # RabbitMQ consumer + orchestration
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm_client.py           # OpenAI client (single call)
│   │   ├── qdrant_client.py        # Qdrant read client
│   │   └── backend_client.py       # HTTP client for Backend internal API
│   └── main.py                     # uvicorn entry point
├── tests/
│   ├── test_worker.py
│   └── test_llm_client.py
├── Dockerfile                      # Multi-stage build
├── requirements.txt
└── README.md
```

---

## Configuration

### Insight Service Environment Variables

```env
# RabbitMQ
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
RABBITMQ_EXCHANGE=documents
RABBITMQ_QUEUE=insight-jobs
RABBITMQ_ROUTING_KEY=document.embedded

# Qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=documents

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Backend
BACKEND_URL=http://backend-backend:80
BACKEND_INTERNAL_API_KEY=internal-secret  # For service-to-service auth

# Service
LOG_LEVEL=info
```

### Backend Environment Variables

```env
# Already exists
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
RABBITMQ_EXCHANGE=documents
RABBITMQ_DOCUMENT_QUEUE=document-jobs

# New
RABBITMQ_INSIGHT_QUEUE=insight-jobs
```

---

## Timing Estimates (Happy Case)

| Step | Duration | Cumulative |
|------|----------|------------|
| Document embedded | 0s | 0s |
| RabbitMQ publish + consume | <1s | ~1s |
| Qdrant fetch (parallel) | 1-2s | ~3s |
| LLM call | 5-8s | ~11s |
| POST /internal/insights | <1s | ~12s |
| MongoDB save + WebSocket emit | <1s | ~13s |
| WebSocket delivery | <1s | ~14s |
| Frontend refetch | 1-2s | ~16s |

**Total: ~15-20 seconds** from upload completion to insights visible in UI.

---

## Future Extensions (Out of Scope)

- **Insight aggregation:** Weekly digest email of all insights
- **Insight trends:** "You had 12 action-items this week vs. 5 last week"
- **Insight search:** Full-text search across insight titles/descriptions
- **Insight templates:** Custom insight types per project
- **LLM model swap:** Use local model instead of OpenAI
- **Batch insights:** Re-analyze all documents when new insight type added
- **Insight feedback:** Thumbs up/down to improve LLM prompts
- **Cron-generated insights:** Trend/anomaly insights from periodic analysis

---

## Appendix: Insight Type Examples

### action-item
```json
{
  "type": "action-item",
  "title": "Legal team must approve section 4.2 by Friday",
  "description": "The partnership agreement draft requires legal review of liability clauses before signing. This was flagged as a blocker in the document.",
  "confidence": 0.92,
  "relatedDocuments": ["doc-123"]
}
```

### connection
```json
{
  "type": "connection",
  "title": "Overlaps with Q3 partnership discussion",
  "description": "This document references the same vendor terms discussed in Q3-Strategy.pdf, suggesting a continuation of prior negotiations rather than a new deal.",
  "confidence": 0.78,
  "relatedDocuments": ["doc-001", "doc-123"]
}
```

### trend
```json
{
  "type": "trend",
  "title": "Increasing focus on mobile-first strategy",
  "description": "Over the past 30 days, references to mobile-first strategy have increased 340% across planning documents. This document continues that pattern with 4 mentions.",
  "confidence": 0.87,
  "relatedDocuments": ["doc-123"]
}
```

### anomaly
```json
{
  "type": "anomaly",
  "title": "Survey response rate dropped 40% this week",
  "description": "The weekly pulse survey typically gets 80% response rate but only received 48% this week. This is the lowest response rate in 6 months.",
  "confidence": 0.95,
  "relatedDocuments": ["doc-123"]
}
```
