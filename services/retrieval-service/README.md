# Retrieval Service

Semantic search service over a Qdrant vector database using OpenAI embeddings.

## Quick Start

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   ```

3. Run the service:
   ```bash
   python main.py
   ```

## API Documentation

### Endpoints

- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe (checks Qdrant connectivity)
- `POST /search` - Semantic search with optional metadata filters

### Search Endpoint

**Request:**
```json
{
  "query": "your search query",
  "filters": {
    "must": [{"key": "project_id", "match": "123"}]
  },
  "limit": 10,
  "offset": 0,
  "score_threshold": 0.5
}
```

**Response:**
```json
{
  "results": [...],
  "total": 10,
  "query_embedding_time_ms": 150,
  "search_time_ms": 20
}
```

## Filter DSL Reference

Filters support three clauses: `must`, `should`, `must_not`. Each clause contains a list of conditions.

### Condition Types

- **match**: Exact string match
  ```json
  {"key": "project_id", "match": "123"}
  ```

- **match_any**: Match any value in a list
  ```json
  {"key": "status", "match_any": ["active", "pending"]}
  ```

- **range**: Numeric range with `gte`, `lte`, `gt`, `lt`
  ```json
  {"key": "created_at", "range": {"gte": 1700000000}}
  ```

## Project Structure

```
services/retrieval-service/
├── src/
│   ├── app.py           # FastAPI application
│   ├── config.py        # Configuration
│   ├── models.py        # Pydantic models
│   ├── search.py        # Search orchestration
│   ├── openai_client.py # OpenAI embedding client
│   └── qdrant_client.py # Qdrant search client
├── tests/               # Test suite
├── main.py              # Entry point
├── requirements.txt     # Dependencies
└── Dockerfile           # Container image
```
