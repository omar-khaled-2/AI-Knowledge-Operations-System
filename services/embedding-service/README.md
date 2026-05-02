# Embedding Service

Embedding service for the document ingestion pipeline.

## Overview

This service consumes embedding jobs from an RQ queue, generates vector embeddings using OpenAI's API, and upserts them to Qdrant.

## Architecture

- **FastAPI** app with health/readiness checks
- **RQ Worker** consumes from `embedding-jobs` queue
- **OpenAI Embeddings API** (`text-embedding-3-small` by default)
- **Qdrant** vector database for storage

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `QUEUE_NAME` | `embedding-jobs` | RQ queue name |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant server URL |
| `QDRANT_COLLECTION` | `documents` | Qdrant collection name |
| `OPENAI_API_KEY` | *(required)* | OpenAI API key |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `LOG_LEVEL` | `info` | Logging level |

## Running Locally

```bash
pip install -r requirements.txt
export OPENAI_API_KEY=sk-...
python main.py
```

## Building Docker Image

```bash
docker build -t embedding-service:latest .
```

## API Endpoints

- `GET /` - Service info
- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe
