# Embedding Service

Embedding service for the document ingestion pipeline.

## Overview

This service consumes embedding jobs from an RQ queue, generates vector embeddings using sentence-transformers, and upserts them to Qdrant.

## Architecture

- **FastAPI** app with health/readiness checks
- **RQ Worker** consumes from `embedding-jobs` queue
- **Sentence Transformers** model (`multi-qa-MiniLM-L6-cos-v1`) for embeddings
- **Qdrant** vector database for storage

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `QUEUE_NAME` | `embedding-jobs` | RQ queue name |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant server URL |
| `QDRANT_COLLECTION` | `documents` | Qdrant collection name |
| `MODEL_NAME` | `sentence-transformers/multi-qa-MiniLM-L6-cos-v1` | Embedding model |
| `LOG_LEVEL` | `info` | Logging level |

## Running Locally

```bash
pip install -r requirements.txt
python src/main.py
```

## Building Docker Image

```bash
docker build -t embedding-service:latest .
```

## API Endpoints

- `GET /` - Service info
- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe
