# Chat Service

AI Chat Processing Service - A stateless pub/sub worker built with FastAPI.

## Overview

This service processes chat messages via Redis pub/sub, generates AI responses (currently stubbed with random text), and supports RAG (Retrieval Augmented Generation) through the retrieval-service.

## Architecture

```
Redis chat:process -> Chat Service -> Redis chat:response
```

The service is a pure background worker with no exposed REST API (except `/health` for Kubernetes probes).

## Development

### Setup

```bash
cd services/chat-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Configuration

Copy `.env.example` to `.env` and adjust values:

```bash
cp .env.example .env
```

### Run

```bash
python -m src.main
```

Or with uvicorn directly:

```bash
uvicorn src.main:app --host 0.0.0.0 --port 3000 --reload
```

### Test

```bash
pytest
```

## Docker

```bash
docker build -t chat-service .
docker run -p 3000:3000 --env-file .env chat-service
```

## Message Flow

1. Backend publishes enriched message to `chat:process`
2. Chat service subscribes, processes message
3. Chat service calls retrieval-service if `projectId` is present
4. Chat service generates stub response as streaming chunks
5. Chat service publishes chunks to `chat:response`
