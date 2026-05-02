# Chat Service Design

**Date:** 2026-05-02
**Status:** Approved

## Overview

A stateless AI chat processing service built with **Python/FastAPI**, communicating exclusively via **Redis pub/sub**. The service receives enriched chat messages, optionally queries the retrieval-service for RAG context, generates stub AI responses (random text), and streams response chunks back over Redis.

**No REST API is exposed.** The service is a pure background worker.

## Context

- **Backend (NestJS):** Owns ChatSession/ChatMessage MongoDB models, REST API for chat history CRUD, orchestrates the chat flow.
- **WebSocket Gateway (Bun):** Manages WebSocket connections, auth tickets, message routing.
- **Chat Service (FastAPI):** Stateless AI response generator. No persistence, no REST API, no WebSocket handling.

## Architecture

### Pub/Sub Message Flow

```
Frontend ──WebSocket──► Gateway
                          │
                          ▼ (publish)
                    ┌─────────────┐
                    │chat:incoming│
                    └──────┬──────┘
                           │ (subscribe)
                    ┌──────▼──────┐
                    │   Backend   │ ──Save to MongoDB, fetch history
                    │  (NestJS)   │
                    └──────┬──────┘
                           │ (publish)
                    ┌──────▼──────┐
                    │chat:process │
                    └──────┬──────┘
                           │ (subscribe)
                    ┌──────▼──────┐
                    │ Chat Service│ ──Call retrieval, generate response
                    │  (FastAPI)  │
                    └──────┬──────┘
                           │ (publish)
                    ┌──────▼──────┐
                    │chat:response│
                    └──────┬──────┘
                           │ (subscribe)
                    ┌──────▼──────┐
                    │   Backend   │ ──Save to MongoDB
                    │  (NestJS)   │ ──Publish to ws:user:{id}
                    └─────────────┘
                           │
                           ▼ (publish)
                    ┌─────────────┐
                    │ ws:user:{id}│
                    └──────┬──────┘
                           │ (subscribe)
                    ┌──────▼──────┐
                    │   Gateway   │ ──Forward to WebSocket
                    │    (Bun)    │
                    └─────────────┘
```

### Redis Channels

| Channel | Publisher | Subscriber | Purpose |
|---------|-----------|------------|---------|
| `chat:incoming` | Gateway | Backend | Raw user message |
| `chat:process` | Backend | Chat Service | Enriched message + history |
| `chat:response` | Chat Service | Backend | AI response chunks |
| `ws:user:{id}` | Backend | Gateway | Forward to WebSocket client |

### Message Schemas

#### `chat:process` (Chat Service Input)
```json
{
  "userId": "string",
  "sessionId": "string",
  "message": "string",
  "history": [
    {"role": "user|assistant|system", "content": "string"}
  ],
  "projectId": "string|null"
}
```

#### `chat:response` (Chat Service Output)
```json
{
  "userId": "string",
  "sessionId": "string",
  "chunk": "string",
  "done": false
}
```

Final chunk:
```json
{
  "userId": "string",
  "sessionId": "string",
  "chunk": "",
  "done": true,
  "sources": [...]
}
```

## Chat Service Responsibilities

| Task | How |
|------|-----|
| Listen for messages | Redis subscribe `chat:process` |
| Retrieve RAG context | HTTP GET to retrieval-service |
| Generate AI response | Stub random text (streaming chunks) |
| Send response | Redis publish `chat:response` |
| Health check | Simple HTTP `/health` endpoint for Kubernetes liveness/readiness probes |

### What Chat Service Does NOT Do

- No REST API (except HTTP `/health` for Kubernetes probes)
- No MongoDB access
- No WebSocket connection management
- No auth handling
- No message persistence

## RAG Integration

When `projectId` is present in the incoming message:

1. Call `retrieval-service` HTTP endpoint with the user's message
2. Include retrieved sources in the final response chunk (`sources` field)
3. Use retrieved context to inform the stub response (for now, random text)

When `projectId` is `null`:
- Skip retrieval call
- Generate stub response without sources

## Stub AI Behavior

Since real AI is not integrated yet, the service generates random text to simulate streaming:

- Split a random sentence into word chunks
- Publish each chunk with `done: false`
- After all chunks, publish final chunk with `done: true` and `sources` (if RAG)
- Add artificial delay between chunks to simulate real streaming

This makes swapping in a real AI provider trivial — replace the stub generator with an async streaming LLM client.

## Project Structure

```
services/chat-service/
├── src/
│   ├── __init__.py
│   ├── main.py              # Entrypoint: starts Redis subscriber loop
│   ├── config.py            # Pydantic Settings (env vars)
│   ├── redis_client.py      # Async Redis pub/sub wrapper
│   ├── services/
│   │   ├── __init__.py
│   │   ├── chat_engine.py   # Message processing + stub AI
│   │   └── retrieval_client.py  # HTTP client for retrieval-service
│   └── schemas/
│       └── messages.py      # Pydantic models for Redis messages
├── tests/
│   ├── test_chat_engine.py
│   └── test_redis_client.py
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

## Configuration

Environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `RETRIEVAL_SERVICE_URL` | URL for retrieval-service | `http://retrieval-service:8000` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Testing Strategy

- **Unit tests:** Stub AI generator, message parsing, Redis pub/sub mocking
- **Integration tests:** Redis container + chat service, verify end-to-end message flow
- **No HTTP API tests** (no exposed API)

## Future Integration: Real AI Provider

When adding a real LLM:

1. Add provider client (OpenAI, Anthropic, etc.)
2. Replace `stub_ai.py` with async streaming LLM client
3. Add `model` and `tokens_used` fields to response schema (if needed)
4. Keep all pub/sub and RAG logic unchanged

## Key Design Decisions

1. **Backend orchestrates persistence** — Chat service is stateless. Backend saves messages before/after processing.
2. **Streaming from day one** — Chat service publishes chunks. Easy to swap stub for real AI later.
3. **RAG is optional** — `projectId` triggers retrieval-service call. No project = no RAG.
4. **Chat service makes outbound HTTP calls** — Only to retrieval-service. No inbound API.
5. **Python/FastAPI** — Aligns with existing AI services (document-processor, embedding-service, retrieval-service). Future AI integration is natural.
