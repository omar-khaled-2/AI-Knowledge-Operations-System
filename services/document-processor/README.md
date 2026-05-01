# Document Processor Service

Service 2 of the 3-service vector ingestion pipeline.

## Overview

Consumes document upload events from Redis Queue, downloads documents from S3, parses them (PDF/MD/TXT), chunks text, and publishes chunks for embedding.

**Current Status (MVP):** Consumes events and logs them. Full processing pipeline coming next.

## Architecture

```
Redis Queue (document-processing)
    ↓
Document Processor Worker (RQ)
    ↓
Logs event (MVP)
    ↓
Future: S3 → Parse → Chunk → Publish to embedding queue
```

## Quick Start

### 1. Install dependencies

```bash
cd services/document-processor
pip install -r requirements.txt
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run the worker

```bash
python -m src.main
```

The worker will start and listen for jobs on the configured Redis queue.

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `QUEUE_NAME` | `document-processing` | RQ queue name to consume |
| `AWS_REGION` | `eu-west-3` | AWS region for S3 |
| `S3_BUCKET_NAME` | `lalo-documents-omar` | S3 bucket for documents |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warning, error) |

## Event Payload

The worker expects jobs with the following event structure:

```json
{
  "version": 1,
  "event": "document.uploaded",
  "documentId": "uuid",
  "s3Key": "projects/uuid/document.pdf",
  "mimeType": "application/pdf",
  "filename": "document.pdf",
  "projectId": "uuid",
  "uploadedBy": "user-id",
  "fileSize": 1024,
  "checksum": "sha256-hash"
}
```

## Project Structure

```
services/document-processor/
├── src/
│   ├── __init__.py
│   ├── main.py          # Entry point
│   ├── config.py        # Environment configuration
│   ├── worker.py        # RQ worker setup
│   └── processor.py     # Document processing logic
├── requirements.txt
├── Dockerfile
└── README.md
```

## Docker

Build and run:

```bash
docker build -t document-processor .
docker run --env-file .env document-processor
```

## Development

### Running tests

```bash
# TODO: Add pytest and tests
```

### Enqueueing test jobs

```python
from redis import Redis
from rq import Queue

redis_conn = Redis.from_url("redis://localhost:6379")
queue = Queue("document-processing", connection=redis_conn)

job = queue.enqueue(
    "src.processor.process_document",
    {
        "version": 1,
        "event": "document.uploaded",
        "documentId": "test-doc-123",
        "s3Key": "projects/test/project-doc.pdf",
        "mimeType": "application/pdf",
        "filename": "project-doc.pdf",
        "projectId": "project-123",
        "uploadedBy": "user-123",
        "fileSize": 1024,
        "checksum": "abc123",
    }
)
```

## Future Work

- [ ] S3 document download
- [ ] PDF parsing
- [ ] Markdown parsing
- [ ] Text parsing
- [ ] Text chunking with configurable strategies
- [ ] Publish chunks to embedding queue
- [ ] Dead letter queue for failed jobs
- [ ] Metrics and monitoring
