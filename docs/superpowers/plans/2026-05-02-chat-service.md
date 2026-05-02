# Chat Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a stateless AI chat processing service with Redis pub/sub communication, integrated with existing backend and websocket gateway.

**Architecture:** Python/FastAPI chat service consumes Redis `chat:process` messages, optionally calls retrieval-service for RAG context, generates stub AI responses as streaming chunks, and publishes to `chat:response`. Backend bridges `chat:incoming` → `chat:process` and `chat:response` → `ws:user:{id}`. Gateway routes WebSocket `chat:message` → `chat:incoming`.

**Tech Stack:** Python 3.11, FastAPI, redis-py (asyncio), httpx, structlog; NestJS, Mongoose, ioredis; Bun, ioredis

---

## File Structure

### Chat Service (services/chat-service/)
- `src/__init__.py`
- `src/main.py` - FastAPI app + lifespan + health check
- `src/config.py` - Pydantic Settings
- `src/redis_client.py` - Async Redis pub/sub client
- `src/services/__init__.py`
- `src/services/chat_engine.py` - Message processing + stub AI generation
- `src/services/retrieval_client.py` - HTTP client for retrieval-service
- `src/schemas/messages.py` - Pydantic models
- `tests/test_chat_engine.py`
- `tests/test_redis_client.py`
- `Dockerfile`
- `requirements.txt`
- `.env.example`
- `README.md`

### Backend (backend/src/)
- `chat/schemas/chat-message.schema.ts` - Mongoose schema for chat messages
- `chat/chat.module.ts` - Chat module
- `chat/chat.service.ts` - Chat service with Redis subscriptions
- `chat/chat.controller.ts` - REST endpoints for chat history
- `websocket/types.ts` - Add chat event types
- `app.module.ts` - Import ChatModule

### WebSocket Gateway (services/websocket-gateway/src/)
- `server.ts` - Add chat:message handling

### Infrastructure
- `infra/helm/chat-service/` - Helm chart
- `infra/skaffold.yaml` - Add chat-service

---

## Task 1: Chat Service Core

**Files:**
- Create: `services/chat-service/src/config.py`
- Create: `services/chat-service/src/schemas/messages.py`
- Create: `services/chat-service/src/services/retrieval_client.py`
- Create: `services/chat-service/src/services/chat_engine.py`
- Create: `services/chat-service/src/redis_client.py`
- Create: `services/chat-service/src/main.py`
- Create: `services/chat-service/requirements.txt`
- Create: `services/chat-service/Dockerfile`
- Create: `services/chat-service/.env.example`
- Create: `services/chat-service/README.md`

---

## Task 2: Chat Service Tests

**Files:**
- Create: `services/chat-service/tests/test_chat_engine.py`
- Create: `services/chat-service/tests/test_redis_client.py`

---

## Task 3: Backend Chat Module

**Files:**
- Create: `backend/src/chat/schemas/chat-message.schema.ts`
- Create: `backend/src/chat/chat.module.ts`
- Create: `backend/src/chat/chat.service.ts`
- Create: `backend/src/chat/chat.controller.ts`
- Modify: `backend/src/websocket/types.ts`
- Modify: `backend/src/app.module.ts`

---

## Task 4: WebSocket Gateway Updates

**Files:**
- Modify: `services/websocket-gateway/src/server.ts`

---

## Task 5: Infrastructure

**Files:**
- Create: `infra/helm/chat-service/Chart.yaml`
- Create: `infra/helm/chat-service/values.yaml`
- Create: `infra/helm/chat-service/templates/deployment.yaml`
- Create: `infra/helm/chat-service/templates/service.yaml`
- Create: `infra/helm/chat-service/templates/configmap.yaml`
- Modify: `infra/skaffold.yaml`
