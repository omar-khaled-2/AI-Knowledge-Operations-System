# Document Ingestion Pipeline Design

**Date:** 2026-05-01  
**Status:** Approved  
**Approach:** RQ Job Queue Pipeline (Approach 2)

## Overview

This document specifies the ingestion pipeline for processing PDF, Markdown, and TXT documents into a vector database (Qdrant) for semantic search. The pipeline consists of two Python services: `document-processor` and `embedding-service`, communicating via Redis Queue (RQ) job queues.

## Architecture

```
Backend Service (existing)
  │ Uploads file to S3
  │ Publishes to Redis Stream
  ▼
┌─────────────────────────────┐
│   Redis Stream              │
│   Key: documents:events     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   document-processor        │
│   (Redis Stream Consumer +  │
│    RQ Worker + FastAPI)     │
│   ├─ Consume stream event   │
│   ├─ Download from S3       │
│   ├─ Parse (PDF/MD/TXT)     │
│   ├─ Semantic chunking      │
│   └─ Enqueue chunk jobs     │
└─────────────┬───────────────┘
              │ Enqueue `EmbedChunkJob`
              ▼
┌─────────────────────────────┐
│   Redis Queue (RQ)          │
│   Queue: embedding-jobs     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   embedding-service         │
│   (RQ Worker + FastAPI)     │
│   ├─ Load model (MiniLM)    │
│   ├─ Embed chunks (384 dim) │
│   └─ Upsert to Qdrant       │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   Qdrant (Vector DB)        │
│   Collection: documents     │
└─────────────────────────────┘
```

**Note:** The backend currently publishes events to Redis Streams. We keep this entry point to minimize backend changes, while using RQ job queues for the internal processing pipeline (document-processor → embedding-service).

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Ingestion path | S3 upload + Redis Stream event | Existing architecture, minimal backend changes |
| Internal communication | RQ Job Queues | User chose job queues for processing pipeline |
| Entry point | Redis Stream consumer | Keep existing document-producer stream consumer |
| Embedding model | `multi-qa-MiniLM-L6-cos-v1` | 384 dims, optimized for QA/retrieval |
| Model loading | Build time | Instant cold starts, model baked into Docker image |
| Chunking strategy | LangChain SemanticChunker | Semantic similarity-based grouping |
| Qdrant structure | Single collection + project_id filter | Simpler infrastructure, filter by project |
| Payload metadata | Minimal (text, doc_id, project_id, chunk_idx, filename) | Sufficient for search results |
| Error handling | None for MVP | No retries, no dead-letter queue |
| Auth | None | Internal cluster only |
| Search service | Deferred to future iteration | Focus on ingestion only |

## Data Flow

### Stage 1: Document Upload

Backend uploads file to S3 and publishes event to Redis Stream (`documents:events`):

```json
{
  "document_id": "uuid",
  "object_key": "projects/{project_id}/documents/{doc_id}/file.pdf",
  "mime_type": "application/pdf",
  "filename": "report.pdf",
  "project_id": "proj-123",
  "uploaded_by": "user@example.com"
}
```

### Stage 2: Document Processing

The `document-processor` worker:

1. Downloads file from S3 using `object_key`
2. Parses based on `mime_type`:
   - `application/pdf` → `pdfplumber`
   - `text/markdown` → direct read
   - `text/plain` → direct read
3. Chunks using `SemanticChunker` with `multi-qa-MiniLM-L6-cos-v1`
4. Enqueues `EmbedChunkJob` for each chunk

### Stage 3: Embedding

The `embedding-service` worker:

1. Loads model (singleton, loaded once at startup)
2. Embeds text → 384-dim vector
3. Upserts to Qdrant collection `documents`

## Component Design

### Document Processor Service

**Files:**
- `src/app.py` — FastAPI app (health/readiness checks)
- `src/config.py` — Configuration (Redis, S3, Qdrant URL, chunk settings)
- `src/worker.py` — Redis Stream consumer (existing, consumes `documents:events`)
- `src/processor.py` — Event processing logic (download, parse, chunk, enqueue)
- `src/parsers/base.py` — Abstract parser interface
- `src/parsers/pdf_parser.py` — PDF text extraction
- `src/parsers/markdown_parser.py` — MD parsing
- `src/parsers/text_parser.py` — TXT parsing
- `src/chunker.py` — LangChain SemanticChunker wrapper
- `src/jobs.py` — RQ job functions (enqueue embedding jobs)
- `src/s3_client.py` — S3 download utility
- `src/main.py` — Entry point (uvicorn + stream consumer thread + RQ worker thread)

**Parser Interface:**
```python
class DocumentParser(ABC):
    @abstractmethod
    def parse(self, file_path: str) -> str:
        """Extract raw text from file."""
```

**Chunker Interface:**
```python
class SemanticChunker:
    def __init__(self, model_name: str, max_chunk_size: int = 512):
        ...
    def chunk(self, text: str) -> list[str]:
        """Split text into semantically coherent chunks."""
```

### Embedding Service

**Files:**
- `src/app.py` — FastAPI app (health checks only)
- `src/config.py` — Configuration (Redis, Qdrant URL, model name)
- `src/model.py` — Sentence transformer model loader (singleton)
- `src/jobs.py` — RQ job functions
- `src/qdrant_client.py` — Qdrant upsert utility
- `src/main.py` — Entry point (uvicorn + RQ worker thread)

## Error Handling

| Scenario | Behavior |
|----------|----------|
| S3 download fails | Job fails, RQ marks as failed, log error |
| Unsupported mime type | Log error, fail job immediately |
| Parse error (corrupted file) | Log error, fail job |
| Empty document (zero text) | Log warning, mark completed with 0 chunks |
| Model not loaded | Worker refuses to start, health check fails |
| Qdrant unavailable | Job fails, RQ marks as failed |
| Chunk text too long | Truncate to model max (512 tokens), log warning |

## Memory Management

- **PDF parsing**: Stream large PDFs page-by-page
- **Chunking**: Process chunks as generator, don't materialize all before enqueuing
- **Embedding**: Single chunk per job (batch optimization deferred)

## Infrastructure

### Docker Images

- **document-processor**: `python:3.11-slim`, installs parsers, model loaded at runtime
- **embedding-service**: `python:3.11-slim`, bakes model into image at build time

### Kubernetes Resources

- **Deployment** for each service:
  - document-processor: 2 replicas
  - embedding-service: 2 replicas
- **Service** (ClusterIP) for each
- **ConfigMap** for non-sensitive config
- **Secrets** for AWS credentials

### Resource Requirements

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| document-processor | 500m | 1000m | 512Mi | 1Gi |
| embedding-service | 500m | 1000m | 1Gi | 2Gi |

### Helm Charts

- Update `infra/helm/document-processor/` for RQ + parsers
- Create `infra/helm/embedding-service/`

### Terraform Changes

- None required (S3, Redis, Qdrant already deployed)

## Qdrant Configuration

- **Collection name**: `documents`
- **Distance metric**: Cosine similarity
- **Vector dimension**: 384
- **Payload fields**:
  - `text`: string (chunk content)
  - `document_id`: string
  - `project_id`: string
  - `chunk_index`: integer
  - `filename`: string

## Out of Scope (Future Iterations)

- Retry logic and dead-letter queues
- Progress tracking ("60% processed")
- Metrics and monitoring (Prometheus)
- Distributed tracing
- Search/retrieval service
- Document re-processing
- Batch embedding optimization
- Multi-tenant collections
- API authentication

## Appendix: Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3.11 |
| Web Framework | FastAPI |
| Job Queue | RQ (Redis Queue) |
| Message Broker | Redis |
| Vector Database | Qdrant |
| Object Storage | AWS S3 |
| PDF Parsing | pdfplumber |
| Chunking | LangChain SemanticChunker |
| Embeddings | sentence-transformers |
| Container | Docker |
| Orchestration | Kubernetes (Helm) |
| Infrastructure | Terraform |
