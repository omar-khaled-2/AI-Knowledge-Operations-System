# Document Processor Service

Service 2 of the 3-service vector ingestion pipeline.

## Overview

Consumes document upload events from Redis Streams, downloads documents from S3, parses them (PDF/MD/TXT), chunks text semantically using OpenAI embeddings, and publishes chunks for embedding.

## Architecture

```
Redis Stream (documents:events)
    ↓
Document Processor Worker (Redis Streams consumer group)
    ↓
S3 Download → Parse → Semantic Chunk (OpenAI) → Enqueue to embedding-jobs RQ
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
python main.py
```

The worker will start and listen for jobs on the configured Redis stream.

## Configuration

All configuration is via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `REDIS_STREAM_KEY` | `documents:events` | Redis stream key to consume |
| `AWS_REGION` | `eu-west-3` | AWS region for S3 |
| `S3_BUCKET_NAME` | `lalo-documents-omar` | S3 bucket for documents |
| `OPENAI_API_KEY` | *(required)* | OpenAI API key for semantic chunking |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model for chunking |
| `EMBEDDING_QUEUE_NAME` | `embedding-jobs` | RQ queue for embedding jobs |
| `MAX_CHUNK_SIZE` | `512` | Max chunk size in characters |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warning, error) |

## Event Payload

The worker expects messages with the following structure:

```json
{
  "version": 1,
  "event": "document.uploaded",
  "documentId": "uuid",
  "objectKey": "projects/uuid/document.pdf",
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
│   ├── app.py           # FastAPI app with health checks
│   ├── main.py          # Entry point
│   ├── config.py        # Environment configuration
│   ├── worker.py        # Redis Streams worker
│   ├── processor.py     # Document processing logic
│   ├── chunker.py       # OpenAI semantic chunker
│   ├── s3_client.py     # S3 download client
│   ├── jobs.py          # RQ job enqueueing
│   └── parsers/         # Document parsers
│       ├── base.py
│       ├── factory.py
│       ├── pdf_parser.py
│       ├── markdown_parser.py
│       └── text_parser.py
├── tests/
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
python -m pytest tests/ -v
```

## Supported Document Types

- `application/pdf` — Extracted using pdfplumber
- `text/markdown` — Raw markdown content
- `text/plain` — Raw text content

## Semantic Chunking

Uses OpenAI's embedding API to split documents at semantic boundaries:
1. Splits text into sentences
2. Generates embeddings for each sentence
3. Compares cosine similarity between adjacent sentences
4. Creates chunks when semantic similarity drops below threshold

This produces more coherent chunks than fixed-size splitting.
