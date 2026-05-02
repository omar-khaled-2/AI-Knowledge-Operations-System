# Retrieval Service

Semantic search service over Qdrant vector database.

## Overview

This service provides a REST API for semantic search. It accepts natural language queries,
generates embeddings via OpenAI, searches the Qdrant vector database, and returns relevant
document chunks with metadata.

## Quick Start

### Prerequisites

- Python 3.11+
- Qdrant running (local or remote)
- OpenAI API key

### Installation

```bash
cd services/retrieval-service
pip install -r requirements.txt
```

### Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `OPENAI_API_KEY` - Your OpenAI API key
- `QDRANT_URL` - Qdrant server URL (default: http://localhost:6333)
- `QDRANT_COLLECTION` - Collection name (default: documents)

### Running Locally

```bash
python main.py
```

The service will be available at http://localhost:3000

### Running with Docker

```bash
docker build -t retrieval-service .
docker run -p 3000:3000 --env-file .env retrieval-service
```

## API Endpoints

### POST /search

Perform semantic search with optional metadata filters.

**Request:**
```json
{
  "query": "What is machine learning?",
  "filters": {
    "must": [
      { "key": "project_id", "match": "123" }
    ]
  },
  "limit": 10,
  "score_threshold": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "chunk_id": "uuid",
      "document_id": "uuid",
      "content": "Machine learning is...",
      "score": 0.95,
      "metadata": {
        "project_id": "123",
        "filename": "ml-intro.pdf"
      }
    }
  ],
  "total": 1,
  "query_embedding_time_ms": 245,
  "search_time_ms": 12
}
```

### GET /health

Liveness probe. Returns 200 if service is running.

### GET /ready

Readiness probe. Returns 200 if Qdrant is accessible.

### GET /

Service info.

## Filter DSL

Filters support three clauses: `must`, `should`, `must_not`.

Each condition can be:
- **match**: Exact value match
  ```json
  { "key": "project_id", "match": "123" }
  ```
- **match_any**: Match any value in array
  ```json
  { "key": "filename", "match_any": ["a.pdf", "b.pdf"] }
  ```
- **range**: Numeric range
  ```json
  { "key": "chunk_index", "range": { "gte": 5, "lte": 10 } }
  ```

## Development

### Running Tests

```bash
python -m pytest tests/ -v
```

### Project Structure

```
src/
  app.py           - FastAPI application
  config.py        - Configuration management
  models.py        - Pydantic request/response models
  search.py        - Search orchestration and filter building
  openai_client.py - OpenAI embedding client
  qdrant_client.py - Qdrant search client
tests/
  test_api.py      - API endpoint tests
  test_search.py   - Search logic tests
  test_filters.py  - Filter translation tests
```
