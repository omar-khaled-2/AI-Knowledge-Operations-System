# Retrieval Service Design Document

**Date:** 2026-05-02  
**Status:** Approved  
**Author:** AI-Knowledge-Operations-System Team  
**Related Systems:** embedding-service, backend (NestJS), Qdrant

## 1. Overview

### 1.1 Purpose
The retrieval-service provides semantic search capabilities over the vector database (Qdrant). It accepts natural language queries, generates embeddings via OpenAI, and returns the most relevant document chunks with metadata filtering support.

### 1.2 Scope
- **In Scope:** Semantic text search, metadata filtering, health/readiness checks, structured logging
- **Out of Scope:** Async retrieval jobs, batch search, caching, vector CRUD operations, admin APIs

### 1.3 Target Consumers
- **Primary:** NestJS backend API (synchronous search requests)
- **Future:** Other microservices requiring vector search capabilities

## 2. Architecture

### 2.1 Service Placement
```
services/
  document-processor/     # Existing: document parsing & chunking
  embedding-service/      # Existing: chunk embedding & Qdrant upserts
  websocket-gateway/      # Existing: real-time communication
  retrieval-service/      # NEW: semantic search over Qdrant
```

### 2.2 Component Diagram
```
┌─────────────────┐     POST /search     ┌──────────────────┐
│   NestJS API    │ ───────────────────> │ retrieval-service│
│   (Backend)     │                      │                  │
└─────────────────┘                      │  ┌────────────┐  │
                                         │  │ OpenAI     │  │
                                         │  │ Client     │  │
                                         │  └─────┬──────┘  │
                                         │        │          │
                                         │  ┌─────▼──────┐  │
                                         │  │ Qdrant     │  │
                                         │  │ Client     │  │
                                         │  └─────┬──────┘  │
                                         └────────┼─────────┘
                                                  │
                                                  ▼
                                          ┌───────────────┐
                                          │    Qdrant     │
                                          │   (Vectors)   │
                                          └───────────────┘
```

### 2.3 Technology Stack
- **Runtime:** Python 3.11+
- **Framework:** FastAPI (consistent with embedding-service and document-processor)
- **HTTP Server:** Uvicorn
- **Logging:** structlog (JSON structured logs)
- **Validation:** Pydantic v2
- **External Clients:** qdrant-client, openai
- **Configuration:** python-dotenv + dataclasses

## 3. API Design

### 3.1 Endpoints

#### POST /search
Perform semantic search with optional metadata filters.

**Request Body:**
```json
{
  "query": "What is machine learning?",
  "filters": {
    "must": [
      { "key": "project_id", "match": "550e8400-e29b-41d4-a716-446655440000" }
    ],
    "should": [
      { "key": "filename", "match_any": ["ml-intro.pdf", "ai-guide.pdf"] }
    ]
  },
  "limit": 10,
  "score_threshold": 0.7,
  "offset": 0
}
```

**Field Definitions:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| query | string | Yes | — | Natural language search query |
| filters | object | No | null | Metadata filter conditions |
| filters.must | array | No | [] | AND conditions (all must match) |
| filters.should | array | No | [] | OR conditions (at least one must match) |
| filters.must_not | array | No | [] | Exclusion conditions (none must match) |
| limit | integer | No | 10 | Max results to return (1-100) |
| score_threshold | float | No | null | Minimum similarity score (0.0-1.0) |
| offset | integer | No | 0 | Pagination offset |

**Filter Condition Types:**
| Type | Format | Description |
|------|--------|-------------|
| match | `{ "key": "field", "match": "value" }` | Exact string/number match |
| match_any | `{ "key": "field", "match_any": ["a", "b"] }` | Match any value in array |
| range | `{ "key": "field", "range": { "gte": 10, "lte": 100 } }` | Numeric/date range |

**Response (200 OK):**
```json
{
  "results": [
    {
      "chunk_id": "550e8400-e29b-41d4-a716-446655440001",
      "document_id": "550e8400-e29b-41d4-a716-446655440002",
      "content": "Machine learning is a subset of artificial intelligence...",
      "score": 0.9234,
      "metadata": {
        "project_id": "550e8400-e29b-41d4-a716-446655440000",
        "chunk_index": 12,
        "filename": "ml-intro.pdf"
      }
    }
  ],
  "total": 1,
  "query_embedding_time_ms": 245,
  "search_time_ms": 12
}
```

**Error Responses:**
| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_FILTERS | Malformed filter conditions |
| 422 | VALIDATION_ERROR | Invalid request body |
| 500 | EMBEDDING_FAILED | OpenAI API error |
| 500 | SEARCH_FAILED | Qdrant connection/query error |
| 503 | SERVICE_UNAVAILABLE | Qdrant not reachable |

#### GET /health
Liveness probe for orchestrators.

**Response (200 OK):**
```json
{
  "status": "healthy"
}
```

#### GET /ready
Readiness probe. Returns 200 when Qdrant connection is verified.

**Response (200 OK):**
```json
{
  "status": "ready",
  "qdrant_connected": true
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "not_ready",
  "qdrant_connected": false
}
```

#### GET /
Service metadata.

**Response (200 OK):**
```json
{
  "service": "retrieval-service",
  "version": "1.0.0",
  "description": "Semantic search over vector database"
}
```

## 4. Data Flow

### 4.1 Search Request Flow
```
1. Client POST /search with query text + filters
2. Validate request body (Pydantic)
3. Generate query embedding via OpenAI API
4. Build Qdrant filter from request filters
5. Execute Qdrant search_with_vector() query
6. Transform Qdrant results to standard response schema
7. Return results with timing metadata
```

### 4.2 Error Handling
- **OpenAI errors:** Log with context, return 500 with code `EMBEDDING_FAILED`
- **Qdrant errors:** Log with context, return 500/503 with code `SEARCH_FAILED`
- **Validation errors:** FastAPI/Pydantic handles automatically (422)
- **Timeout:** Configurable timeout on embedding generation (default 30s)

## 5. Configuration

### 5.1 Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| QDRANT_URL | No | `http://localhost:6333` | Qdrant server URL |
| QDRANT_COLLECTION | No | `documents` | Collection name |
| OPENAI_API_KEY | Yes | — | OpenAI API key |
| EMBEDDING_MODEL | No | `text-embedding-3-small` | Model for query embedding |
| LOG_LEVEL | No | `info` | Logging level |
| PORT | No | `3000` | HTTP server port |
| REQUEST_TIMEOUT | No | `30` | Max seconds per request |

### 5.2 Collection Schema Assumptions
The service assumes the Qdrant collection has:
- **Vector size:** 384 (matching embedding-service)
- **Distance:** Cosine
- **Payload fields:** `text`, `document_id`, `project_id`, `chunk_index`, `filename` (as stored by embedding-service)

**Response Mapping:** The API maps internal Qdrant payload fields to the response schema:
- `text` → `content`
- `document_id` → `document_id`
- All other payload fields → `metadata` object

## 6. Implementation Details

### 6.1 File Structure
```
services/retrieval-service/
├── main.py                    # Entry point (uvicorn)
├── Dockerfile                 # Container image
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variable template
├── README.md                 # Service documentation
├── src/
│   ├── __init__.py
│   ├── app.py                # FastAPI application + lifespan
│   ├── config.py             # Configuration dataclass
│   ├── models.py             # Pydantic request/response models
│   ├── search.py             # Search business logic
│   ├── openai_client.py      # OpenAI embedding client wrapper
│   └── qdrant_client.py      # Qdrant search client wrapper
└── tests/
    ├── __init__.py
    ├── test_api.py           # API endpoint tests
    ├── test_search.py        # Search logic tests
    └── test_filters.py       # Filter translation tests
```

### 6.2 Key Implementation Decisions
1. **Embedding generation in service:** Keeps API simple (text in, results out). Future services don't need their own OpenAI integration.
2. **Filter DSL abstraction:** Provides a cleaner API than raw Qdrant filter syntax while remaining flexible.
3. **No caching (MVP):** Adds complexity; can be added later if query latency becomes an issue.
4. **No async worker:** Purely synchronous REST API. Async retrieval can be added as a separate endpoint later.
5. **No auth in service:** Assumes service runs in internal network; auth handled by API gateway or backend.

## 7. Testing Strategy

### 7.1 Unit Tests
- Filter DSL → Qdrant filter translation
- Request/response model validation (edge cases, invalid inputs)
- OpenAI client error handling (mocked)
- Qdrant client error handling (mocked)

### 7.2 Integration Tests
- Full `/search` flow with mocked OpenAI + mocked Qdrant
- Health/readiness endpoints
- Filter combinations (must, should, must_not)

### 7.3 Test Infrastructure
- pytest for test runner
- unittest.mock for mocking external clients
- pytest-asyncio for async endpoint tests

## 8. Operational Concerns

### 8.1 Logging
- Structured JSON logs via structlog
- Log per request: query (truncated), filters, result count, timing
- Log errors with full context (not query text for privacy)

### 8.2 Health Checks
- **Liveness:** Always returns 200 if process is running
- **Readiness:** Verifies Qdrant connection on each call (lightweight `get_collection()` check)

### 8.3 Resource Limits
- Request timeout: 30s default (configurable)
- Max results per query: 100
- Max query length: 4000 characters (OpenAI embedding limit)

### 8.4 Failure Modes
| Scenario | Behavior | Recovery |
|----------|----------|----------|
| OpenAI API down | Return 500, log error | Retry on next request |
| Qdrant unreachable | Return 503, mark not ready | Auto-retry on next health check |
| Invalid filter key | Return 400, specify invalid key | Client fixes request |
| Empty collection | Return 200 with empty results | Normal operation |

## 9. Deployment

### 9.1 Container
- Python 3.11 slim base image
- Multi-stage build (install deps → copy code)
- Non-root user
- Expose port 3000

### 9.2 Dependencies
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
qdrant-client==1.17.1
openai==1.59.9
python-dotenv==1.0.0
structlog==24.1.0
pydantic==2.5.0
```

### 9.3 Orchestration
- Add to existing docker-compose or Kubernetes manifests alongside other services
- Connect to same Qdrant instance as embedding-service
- No RabbitMQ needed (REST API only)

## 10. Future Considerations (Out of Scope)

- **Caching:** Redis cache for frequent queries
- **Batch search:** `/search/batch` endpoint for multiple queries
- **Vector search:** `/search/vector` endpoint accepting pre-computed embeddings
- **Re-ranking:** Cross-encoder re-ranking of top-k results
- **Streaming:** SSE streaming for progressive result delivery
- **Metrics:** Prometheus metrics for query latency, error rates, result counts

## 11. Open Questions

None. All clarifying questions resolved during design discussion.

---

**Approval:** Design approved 2026-05-02. Ready for implementation planning.
