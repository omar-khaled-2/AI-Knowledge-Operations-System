# Retrieval Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone `retrieval-service` in `services/retrieval-service/` that provides semantic search over Qdrant via a REST API.

**Architecture:** FastAPI service that generates query embeddings via OpenAI, translates structured filter DSL to Qdrant filters, and returns standardized search results. Follows the exact patterns established by `embedding-service` and `document-processor`.

**Tech Stack:** Python 3.11, FastAPI, Uvicorn, Pydantic v2, structlog, qdrant-client, openai, pytest

---

## File Structure

```
services/retrieval-service/
├── main.py                    # Entry point (uvicorn)
├── Dockerfile                 # Container image
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variable template
├── README.md                 # Service documentation
├── src/
│   ├── __init__.py
│   ├── app.py                # FastAPI application + lifespan
│   ├── config.py             # Configuration dataclass
│   ├── models.py             # Pydantic request/response models
│   ├── search.py             # Search orchestration logic
│   ├── openai_client.py      # OpenAI embedding client wrapper
│   └── qdrant_client.py      # Qdrant search client wrapper
└── tests/
    ├── __init__.py
    ├── conftest.py           # Shared test fixtures
    ├── test_filters.py       # Filter DSL → Qdrant filter tests
    ├── test_search.py        # Search orchestration tests
    ├── test_openai_client.py # OpenAI client tests
    ├── test_qdrant_client.py # Qdrant client tests
    └── test_api.py           # FastAPI endpoint tests
```

---

## Task 1: Create Project Structure and Configuration

**Files:**
- Create: `services/retrieval-service/requirements.txt`
- Create: `services/retrieval-service/.env.example`
- Create: `services/retrieval-service/src/__init__.py`
- Create: `services/retrieval-service/tests/__init__.py`
- Create: `services/retrieval-service/tests/conftest.py`
- Create: `services/retrieval-service/src/config.py`

- [ ] **Step 1: Create directories and requirements.txt**

```bash
mkdir -p services/retrieval-service/src
mkdir -p services/retrieval-service/tests
```

```
# services/retrieval-service/requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
qdrant-client==1.17.1
openai==1.59.9
python-dotenv==1.0.0
structlog==24.1.0
pydantic==2.5.0
```

- [ ] **Step 2: Create .env.example**

```
# services/retrieval-service/.env.example
# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=documents

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
EMBEDDING_MODEL=text-embedding-3-small

# Service Configuration
LOG_LEVEL=info
PORT=3000
REQUEST_TIMEOUT=30
```

- [ ] **Step 3: Create config.py**

```python
# services/retrieval-service/src/config.py
"""Retrieval Service - Configuration."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    """Service configuration loaded from environment variables."""

    # Qdrant
    qdrant_url: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    qdrant_collection: str = os.getenv("QDRANT_COLLECTION", "documents")

    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    # Service
    port: int = int(os.getenv("PORT", "3000"))
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "30"))

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "info").upper()

    @classmethod
    def from_env(cls) -> "Config":
        """Create configuration from environment variables."""
        return cls()
```

- [ ] **Step 4: Create test fixtures**

```python
# services/retrieval-service/tests/conftest.py
"""Shared test fixtures for retrieval-service."""

import pytest

from src.config import Config


@pytest.fixture
def test_config():
    """Provide a test configuration."""
    return Config(
        qdrant_url="http://test-qdrant:6333",
        qdrant_collection="test-collection",
        openai_api_key="test-api-key",
        embedding_model="text-embedding-3-small",
        port=3000,
        request_timeout=30,
        log_level="INFO",
    )
```

- [ ] **Step 5: Verify project structure**

Run:
```bash
tree services/retrieval-service/
```

Expected output shows directories and files created.

- [ ] **Step 6: Commit**

```bash
git add services/retrieval-service/
git commit -m "feat(retrieval-service): create project structure and configuration"
```

---

## Task 2: Write Pydantic Models

**Files:**
- Create: `services/retrieval-service/src/models.py`
- Create: `services/retrieval-service/tests/test_models.py`

- [ ] **Step 1: Write model tests**

```python
# services/retrieval-service/tests/test_models.py
"""Tests for Pydantic models."""

import pytest
from pydantic import ValidationError

from src.models import SearchRequest, SearchResponse, SearchResult


class TestSearchRequest:
    def test_valid_request(self):
        req = SearchRequest(query="test query")
        assert req.query == "test query"
        assert req.limit == 10
        assert req.offset == 0
        assert req.filters is None
        assert req.score_threshold is None

    def test_valid_request_with_filters(self):
        req = SearchRequest(
            query="test query",
            filters={
                "must": [
                    {"key": "project_id", "match": "123"}
                ]
            },
            limit=5,
            offset=10,
            score_threshold=0.8,
        )
        assert req.limit == 5
        assert req.offset == 10
        assert req.score_threshold == 0.8

    def test_limit_validation(self):
        with pytest.raises(ValidationError):
            SearchRequest(query="test", limit=0)
        
        with pytest.raises(ValidationError):
            SearchRequest(query="test", limit=101)

    def test_offset_validation(self):
        with pytest.raises(ValidationError):
            SearchRequest(query="test", offset=-1)

    def test_score_threshold_validation(self):
        with pytest.raises(ValidationError):
            SearchRequest(query="test", score_threshold=-0.1)
        
        with pytest.raises(ValidationError):
            SearchRequest(query="test", score_threshold=1.1)


class TestSearchResult:
    def test_valid_result(self):
        result = SearchResult(
            chunk_id="test-chunk-id",
            document_id="test-doc-id",
            content="test content",
            score=0.95,
            metadata={"project_id": "123"},
        )
        assert result.score == 0.95
        assert result.metadata["project_id"] == "123"


class TestSearchResponse:
    def test_valid_response(self):
        response = SearchResponse(
            results=[
                SearchResult(
                    chunk_id="chunk-1",
                    document_id="doc-1",
                    content="content",
                    score=0.9,
                    metadata={},
                )
            ],
            total=1,
            query_embedding_time_ms=100,
            search_time_ms=10,
        )
        assert response.total == 1
        assert len(response.results) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/retrieval-service && python -m pytest tests/test_models.py -v
```

Expected: FAIL - "ModuleNotFoundError: No module named 'src.models'"

- [ ] **Step 3: Write models.py**

```python
# services/retrieval-service/src/models.py
"""Retrieval Service - Pydantic Models."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class FilterCondition(BaseModel):
    """Single filter condition."""

    key: str = Field(..., description="Payload field name to filter on")
    match: Optional[str] = Field(None, description="Exact match value")
    match_any: Optional[List[str]] = Field(None, description="Match any value in list")
    range: Optional[Dict[str, Any]] = Field(None, description="Range filter with gte/lte/lt/gt")


class SearchFilters(BaseModel):
    """Structured filter DSL for search queries."""

    must: Optional[List[FilterCondition]] = Field(default_factory=list)
    should: Optional[List[FilterCondition]] = Field(default_factory=list)
    must_not: Optional[List[FilterCondition]] = Field(default_factory=list)


class SearchRequest(BaseModel):
    """Request body for semantic search."""

    query: str = Field(..., description="Natural language search query")
    filters: Optional[SearchFilters] = None
    limit: int = Field(default=10, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    score_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class SearchResult(BaseModel):
    """Single search result."""

    chunk_id: str
    document_id: str
    content: str
    score: float
    metadata: Dict[str, Any]


class SearchResponse(BaseModel):
    """Response body for semantic search."""

    results: List[SearchResult]
    total: int
    query_embedding_time_ms: int
    search_time_ms: int
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd services/retrieval-service && python -m pytest tests/test_models.py -v
```

Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/retrieval-service/src/models.py services/retrieval-service/tests/test_models.py
git commit -m "feat(retrieval-service): add pydantic search models with validation"
```

---

## Task 3: Write Filter Builder

**Files:**
- Create: `services/retrieval-service/src/search.py` (filter building portion)
- Create: `services/retrieval-service/tests/test_filters.py`

- [ ] **Step 1: Write filter tests**

```python
# services/retrieval-service/tests/test_filters.py
"""Tests for filter DSL to Qdrant filter translation."""

import pytest

from src.models import FilterCondition, SearchFilters
from src.search import build_qdrant_filter


class TestBuildQdrantFilter:
    def test_empty_filters(self):
        result = build_qdrant_filter(None)
        assert result is None

    def test_single_must_filter(self):
        filters = SearchFilters(
            must=[FilterCondition(key="project_id", match="123")]
        )
        result = build_qdrant_filter(filters)
        assert result is not None
        assert len(result.must) == 1

    def test_must_and_should_filters(self):
        filters = SearchFilters(
            must=[FilterCondition(key="project_id", match="123")],
            should=[FilterCondition(key="filename", match_any=["a.pdf", "b.pdf"])],
        )
        result = build_qdrant_filter(filters)
        assert len(result.must) == 1
        assert len(result.should) == 1

    def test_must_not_filter(self):
        filters = SearchFilters(
            must_not=[FilterCondition(key="status", match="deleted")]
        )
        result = build_qdrant_filter(filters)
        assert len(result.must_not) == 1

    def test_range_filter(self):
        filters = SearchFilters(
            must=[FilterCondition(key="chunk_index", range={"gte": 5, "lte": 10})]
        )
        result = build_qdrant_filter(filters)
        assert len(result.must) == 1

    def test_invalid_filter_no_values(self):
        filters = SearchFilters(
            must=[FilterCondition(key="project_id")]
        )
        with pytest.raises(ValueError, match="Filter must have match, match_any, or range"):
            build_qdrant_filter(filters)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/retrieval-service && python -m pytest tests/test_filters.py -v
```

Expected: FAIL - "ModuleNotFoundError: No module named 'src.search'"

- [ ] **Step 3: Write search.py with filter builder**

```python
# services/retrieval-service/src/search.py
"""Retrieval Service - Search Logic."""

from typing import Optional

from qdrant_client.models import (
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
    Range,
)

from src.models import FilterCondition, SearchFilters


def build_qdrant_filter(filters: Optional[SearchFilters]) -> Optional[Filter]:
    """Translate structured filter DSL to Qdrant Filter.

    Args:
        filters: Structured search filters.

    Returns:
        Qdrant Filter object or None if no filters provided.
    """
    if filters is None:
        return None

    must_conditions = []
    should_conditions = []
    must_not_conditions = []

    if filters.must:
        for condition in filters.must:
            must_conditions.append(_translate_condition(condition))

    if filters.should:
        for condition in filters.should:
            should_conditions.append(_translate_condition(condition))

    if filters.must_not:
        for condition in filters.must_not:
            must_not_conditions.append(_translate_condition(condition))

    if not must_conditions and not should_conditions and not must_not_conditions:
        return None

    return Filter(
        must=must_conditions or None,
        should=should_conditions or None,
        must_not=must_not_conditions or None,
    )


def _translate_condition(condition: FilterCondition) -> FieldCondition:
    """Translate a single FilterCondition to Qdrant FieldCondition.

    Args:
        condition: Filter condition from request.

    Returns:
        Qdrant FieldCondition.

    Raises:
        ValueError: If condition has no valid match criteria.
    """
    if condition.match is not None:
        return FieldCondition(
            key=condition.key,
            match=MatchValue(value=condition.match),
        )
    elif condition.match_any is not None:
        return FieldCondition(
            key=condition.key,
            match=MatchAny(any=condition.match_any),
        )
    elif condition.range is not None:
        return FieldCondition(
            key=condition.key,
            range=Range(
                gte=condition.range.get("gte"),
                lte=condition.range.get("lte"),
                gt=condition.range.get("gt"),
                lt=condition.range.get("lt"),
            ),
        )
    else:
        raise ValueError("Filter must have match, match_any, or range")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd services/retrieval-service && python -m pytest tests/test_filters.py -v
```

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/retrieval-service/src/search.py services/retrieval-service/tests/test_filters.py
git commit -m "feat(retrieval-service): add filter DSL to Qdrant filter translation"
```

---

## Task 4: Write Qdrant Search Client

**Files:**
- Create: `services/retrieval-service/src/qdrant_client.py`
- Create: `services/retrieval-service/tests/test_qdrant_client.py`

- [ ] **Step 1: Write Qdrant client tests**

```python
# services/retrieval-service/tests/test_qdrant_client.py
"""Tests for Qdrant search client."""

from unittest.mock import Mock, patch

import pytest

from src.qdrant_client import QdrantSearchClient


class TestQdrantSearchClient:
    def test_init(self, test_config):
        client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
        assert client.url == test_config.qdrant_url
        assert client.collection_name == test_config.qdrant_collection
        assert client._client is None

    def test_lazy_client_initialization(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant:
            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            _ = client.client
            mock_qdrant.assert_called_once_with(url=test_config.qdrant_url)

    def test_search(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant_class:
            mock_client = Mock()
            mock_qdrant_class.return_value = mock_client

            # Mock search results
            mock_result = Mock()
            mock_result.id = "chunk-1"
            mock_result.score = 0.95
            mock_result.payload = {
                "text": "test content",
                "document_id": "doc-1",
                "project_id": "proj-1",
                "chunk_index": 0,
                "filename": "test.pdf",
            }
            mock_client.search.return_value = [mock_result]

            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            vector = [0.1] * 384
            results = client.search(vector=vector, limit=10)

            assert len(results) == 1
            assert results[0]["id"] == "chunk-1"
            assert results[0]["score"] == 0.95
            mock_client.search.assert_called_once()

    def test_search_with_filter(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant_class:
            mock_client = Mock()
            mock_qdrant_class.return_value = mock_client
            mock_client.search.return_value = []

            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            vector = [0.1] * 384
            
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            filter_obj = Filter(
                must=[FieldCondition(key="project_id", match=MatchValue(value="123"))]
            )
            
            client.search(vector=vector, limit=5, filter_obj=filter_obj, score_threshold=0.8)

            call_args = mock_client.search.call_args
            assert call_args.kwargs['limit'] == 5
            assert call_args.kwargs['score_threshold'] == 0.8

    def test_health_check_success(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant_class:
            mock_client = Mock()
            mock_qdrant_class.return_value = mock_client
            mock_client.get_collection.return_value = Mock()

            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            assert client.health_check() is True

    def test_health_check_failure(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant_class:
            mock_client = Mock()
            mock_qdrant_class.return_value = mock_client
            mock_client.get_collection.side_effect = Exception("Connection refused")

            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            assert client.health_check() is False
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/retrieval-service && python -m pytest tests/test_qdrant_client.py -v
```

Expected: FAIL - "ModuleNotFoundError: No module named 'src.qdrant_client'"

- [ ] **Step 3: Write qdrant_client.py**

```python
# services/retrieval-service/src/qdrant_client.py
"""Retrieval Service - Qdrant Search Client."""

from typing import Any, Dict, List, Optional

import structlog
from qdrant_client import QdrantClient

logger = structlog.get_logger()


class QdrantSearchClient:
    """Client for searching vectors in Qdrant."""

    def __init__(self, url: str, collection_name: str):
        """Initialize Qdrant search client.

        Args:
            url: Qdrant server URL.
            collection_name: Name of the collection to search.
        """
        self.url = url
        self.collection_name = collection_name
        self._client = None

    @property
    def client(self) -> QdrantClient:
        """Lazy initialization of Qdrant client."""
        if self._client is None:
            self._client = QdrantClient(url=self.url)
        return self._client

    def search(
        self,
        vector: List[float],
        limit: int = 10,
        offset: int = 0,
        filter_obj: Optional[Any] = None,
        score_threshold: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors in Qdrant.

        Args:
            vector: Query embedding vector.
            limit: Maximum number of results.
            offset: Pagination offset.
            filter_obj: Qdrant Filter object.
            score_threshold: Minimum similarity score.

        Returns:
            List of search results with id, score, and payload.
        """
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=limit,
            offset=offset,
            query_filter=filter_obj,
            score_threshold=score_threshold,
        )

        logger.info(
            "Qdrant search completed",
            collection=self.collection_name,
            limit=limit,
            results_count=len(results),
        )

        return [
            {
                "id": str(result.id),
                "score": result.score,
                "payload": result.payload,
            }
            for result in results
        ]

    def health_check(self) -> bool:
        """Check if Qdrant is accessible and collection exists.

        Returns:
            True if healthy, False otherwise.
        """
        try:
            self.client.get_collection(self.collection_name)
            return True
        except Exception as e:
            logger.warning(
                "Qdrant health check failed",
                error=str(e),
                collection=self.collection_name,
            )
            return False
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd services/retrieval-service && python -m pytest tests/test_qdrant_client.py -v
```

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/retrieval-service/src/qdrant_client.py services/retrieval-service/tests/test_qdrant_client.py
git commit -m "feat(retrieval-service): add Qdrant search client with health checks"
```

---

## Task 5: Write OpenAI Embedding Client

**Files:**
- Create: `services/retrieval-service/src/openai_client.py`
- Create: `services/retrieval-service/tests/test_openai_client.py`

- [ ] **Step 1: Write OpenAI client tests**

```python
# services/retrieval-service/tests/test_openai_client.py
"""Tests for OpenAI embedding client."""

from unittest.mock import Mock, patch

import pytest

from src.openai_client import OpenAIEmbeddingClient


class TestOpenAIEmbeddingClient:
    def test_init(self, test_config):
        client = OpenAIEmbeddingClient(test_config.openai_api_key, test_config.embedding_model)
        assert client.api_key == test_config.openai_api_key
        assert client.model == test_config.embedding_model
        assert client._client is None

    def test_embed(self, test_config):
        with patch('src.openai_client.OpenAI') as mock_openai_class:
            mock_client = Mock()
            mock_openai_class.return_value = mock_client

            # Mock embeddings.create response
            mock_embedding = Mock()
            mock_embedding.embedding = [0.1] * 384
            mock_response = Mock()
            mock_response.data = [mock_embedding]
            mock_client.embeddings.create.return_value = mock_response

            client = OpenAIEmbeddingClient(test_config.openai_api_key, test_config.embedding_model)
            result = client.embed("test query")

            assert len(result) == 384
            assert result[0] == 0.1
            mock_client.embeddings.create.assert_called_once_with(
                input="test query",
                model=test_config.embedding_model,
            )

    def test_embed_empty_text(self, test_config):
        with patch('src.openai_client.OpenAI') as mock_openai_class:
            mock_client = Mock()
            mock_openai_class.return_value = mock_client

            mock_embedding = Mock()
            mock_embedding.embedding = [0.0] * 384
            mock_response = Mock()
            mock_response.data = [mock_embedding]
            mock_client.embeddings.create.return_value = mock_response

            client = OpenAIEmbeddingClient(test_config.openai_api_key, test_config.embedding_model)
            result = client.embed("")

            assert len(result) == 384

    def test_embed_api_error(self, test_config):
        with patch('src.openai_client.OpenAI') as mock_openai_class:
            mock_client = Mock()
            mock_openai_class.return_value = mock_client
            mock_client.embeddings.create.side_effect = Exception("API Error")

            client = OpenAIEmbeddingClient(test_config.openai_api_key, test_config.embedding_model)
            
            with pytest.raises(Exception, match="API Error"):
                client.embed("test query")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/retrieval-service && python -m pytest tests/test_openai_client.py -v
```

Expected: FAIL - "ModuleNotFoundError: No module named 'src.openai_client'"

- [ ] **Step 3: Write openai_client.py**

```python
# services/retrieval-service/src/openai_client.py
"""Retrieval Service - OpenAI Embedding Client."""

from typing import List

import structlog
from openai import OpenAI

logger = structlog.get_logger()


class OpenAIEmbeddingClient:
    """Client for generating query embeddings via OpenAI."""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        """Initialize OpenAI embedding client.

        Args:
            api_key: OpenAI API key.
            model: Embedding model name.
        """
        self.api_key = api_key
        self.model = model
        self._client = None

    @property
    def client(self) -> OpenAI:
        """Lazy initialization of OpenAI client."""
        if self._client is None:
            self._client = OpenAI(api_key=self.api_key)
        return self._client

    def embed(self, text: str) -> List[float]:
        """Generate embedding for text.

        Args:
            text: Text to embed.

        Returns:
            Embedding vector.

        Raises:
            Exception: If OpenAI API call fails.
        """
        logger.debug("Generating embedding", text_length=len(text))

        response = self.client.embeddings.create(
            input=text,
            model=self.model,
        )

        embedding = response.data[0].embedding

        logger.debug("Embedding generated", vector_dim=len(embedding))

        return embedding
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd services/retrieval-service && python -m pytest tests/test_openai_client.py -v
```

Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/retrieval-service/src/openai_client.py services/retrieval-service/tests/test_openai_client.py
git commit -m "feat(retrieval-service): add OpenAI embedding client"
```

---

## Task 6: Write Search Orchestration

**Files:**
- Modify: `services/retrieval-service/src/search.py` (add orchestration)
- Create: `services/retrieval-service/tests/test_search.py`

- [ ] **Step 1: Write search orchestration tests**

```python
# services/retrieval-service/tests/test_search.py
"""Tests for search orchestration."""

import time
from unittest.mock import Mock, patch

import pytest

from src.models import SearchFilters, FilterCondition, SearchRequest
from src.search import SearchService


class TestSearchService:
    def test_search_success(self, test_config):
        # Mock OpenAI client
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        # Mock Qdrant client
        mock_qdrant = Mock()
        mock_qdrant.search.return_value = [
            {
                "id": "chunk-1",
                "score": 0.95,
                "payload": {
                    "text": "test content",
                    "document_id": "doc-1",
                    "project_id": "proj-1",
                    "chunk_index": 0,
                    "filename": "test.pdf",
                },
            }
        ]

        service = SearchService(test_config)
        service.openai_client = mock_openai
        service.qdrant_client = mock_qdrant

        request = SearchRequest(query="test query", limit=5)
        response = service.search(request)

        assert response.total == 1
        assert len(response.results) == 1
        assert response.results[0].chunk_id == "chunk-1"
        assert response.results[0].content == "test content"
        assert response.results[0].document_id == "doc-1"
        assert response.results[0].score == 0.95
        assert response.results[0].metadata["project_id"] == "proj-1"

        mock_openai.embed.assert_called_once_with("test query")
        mock_qdrant.search.assert_called_once()

    def test_search_with_filters(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = []

        service = SearchService(test_config)
        service.openai_client = mock_openai
        service.qdrant_client = mock_qdrant

        request = SearchRequest(
            query="test query",
            filters=SearchFilters(
                must=[FilterCondition(key="project_id", match="123")]
            ),
            limit=10,
        )
        response = service.search(request)

        assert response.total == 0
        assert len(response.results) == 0

        # Verify Qdrant search was called with filter
        call_args = mock_qdrant.search.call_args
        assert call_args.kwargs['filter_obj'] is not None

    def test_search_empty_results(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = []

        service = SearchService(test_config)
        service.openai_client = mock_openai
        service.qdrant_client = mock_qdrant

        request = SearchRequest(query="test query")
        response = service.search(request)

        assert response.total == 0
        assert len(response.results) == 0

    def test_search_embedding_error(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.side_effect = Exception("OpenAI API Error")

        service = SearchService(test_config)
        service.openai_client = mock_openai

        request = SearchRequest(query="test query")

        with pytest.raises(Exception, match="OpenAI API Error"):
            service.search(request)

    def test_search_qdrant_error(self, test_config):
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.side_effect = Exception("Qdrant Error")

        service = SearchService(test_config)
        service.openai_client = mock_openai
        service.qdrant_client = mock_qdrant

        request = SearchRequest(query="test query")

        with pytest.raises(Exception, match="Qdrant Error"):
            service.search(request)

    def test_result_mapping(self, test_config):
        """Test that Qdrant payload is correctly mapped to response schema."""
        mock_openai = Mock()
        mock_openai.embed.return_value = [0.1] * 384

        mock_qdrant = Mock()
        mock_qdrant.search.return_value = [
            {
                "id": "chunk-1",
                "score": 0.88,
                "payload": {
                    "text": "content text",
                    "document_id": "doc-1",
                    "project_id": "proj-1",
                    "chunk_index": 5,
                    "filename": "file.pdf",
                    "custom_field": "custom_value",
                },
            }
        ]

        service = SearchService(test_config)
        service.openai_client = mock_openai
        service.qdrant_client = mock_qdrant

        request = SearchRequest(query="test")
        response = service.search(request)

        result = response.results[0]
        assert result.chunk_id == "chunk-1"
        assert result.content == "content text"
        assert result.document_id == "doc-1"
        assert result.score == 0.88
        # Known fields should be in metadata too for completeness
        assert result.metadata["project_id"] == "proj-1"
        assert result.metadata["chunk_index"] == 5
        assert result.metadata["filename"] == "file.pdf"
        assert result.metadata["custom_field"] == "custom_value"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/retrieval-service && python -m pytest tests/test_search.py -v
```

Expected: FAIL - "AttributeError: module 'src.search' has no attribute 'SearchService'"

- [ ] **Step 3: Add SearchService to search.py**

```python
# services/retrieval-service/src/search.py
"""Retrieval Service - Search Logic."""

import time
from typing import List, Optional

import structlog
from qdrant_client.models import (
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
    Range,
)

from src.config import Config
from src.models import FilterCondition, SearchFilters, SearchRequest, SearchResponse, SearchResult
from src.openai_client import OpenAIEmbeddingClient
from src.qdrant_client import QdrantSearchClient

logger = structlog.get_logger()

# ... build_qdrant_filter and _translate_condition from Task 3 ...


class SearchService:
    """Orchestrates semantic search: embed query → search Qdrant → format results."""

    def __init__(self, config: Config):
        """Initialize search service with clients.

        Args:
            config: Service configuration.
        """
        self.config = config
        self.openai_client = OpenAIEmbeddingClient(
            api_key=config.openai_api_key,
            model=config.embedding_model,
        )
        self.qdrant_client = QdrantSearchClient(
            url=config.qdrant_url,
            collection_name=config.qdrant_collection,
        )

    def search(self, request: SearchRequest) -> SearchResponse:
        """Execute semantic search.

        Args:
            request: Search request with query and filters.

        Returns:
            Search response with results and timing.
        """
        logger.info(
            "Starting search",
            query=request.query[:50],
            limit=request.limit,
        )

        # Generate query embedding
        embed_start = time.time()
        query_vector = self.openai_client.embed(request.query)
        embed_time_ms = int((time.time() - embed_start) * 1000)

        logger.debug("Query embedded", vector_dim=len(query_vector), time_ms=embed_time_ms)

        # Build Qdrant filter
        filter_obj = build_qdrant_filter(request.filters)

        # Search Qdrant
        search_start = time.time()
        raw_results = self.qdrant_client.search(
            vector=query_vector,
            limit=request.limit,
            offset=request.offset,
            filter_obj=filter_obj,
            score_threshold=request.score_threshold,
        )
        search_time_ms = int((time.time() - search_start) * 1000)

        logger.info(
            "Search completed",
            results_count=len(raw_results),
            embed_time_ms=embed_time_ms,
            search_time_ms=search_time_ms,
        )

        # Transform to response schema
        results = self._transform_results(raw_results)

        return SearchResponse(
            results=results,
            total=len(results),
            query_embedding_time_ms=embed_time_ms,
            search_time_ms=search_time_ms,
        )

    def _transform_results(self, raw_results: List[dict]) -> List[SearchResult]:
        """Transform Qdrant results to standardized response schema.

        Args:
            raw_results: Raw results from Qdrant client.

        Returns:
            List of SearchResult objects.
        """
        return [
            SearchResult(
                chunk_id=result["id"],
                document_id=result["payload"].get("document_id", ""),
                content=result["payload"].get("text", ""),
                score=result["score"],
                metadata={
                    k: v
                    for k, v in result["payload"].items()
                    if k not in ("text", "document_id")
                },
            )
            for result in raw_results
        ]
```

**Note:** Replace the existing `search.py` content with the complete file including both the filter builder functions from Task 3 and the new SearchService class.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd services/retrieval-service && python -m pytest tests/test_search.py -v
```

Expected: All 6 tests PASS

- [ ] **Step 5: Run all tests to verify no regressions**

```bash
cd services/retrieval-service && python -m pytest tests/ -v
```

Expected: All tests PASS (filter + qdrant + openai + search + models tests)

- [ ] **Step 6: Commit**

```bash
git add services/retrieval-service/src/search.py services/retrieval-service/tests/test_search.py
git commit -m "feat(retrieval-service): add search orchestration with result mapping"
```

---

## Task 7: Write FastAPI Application

**Files:**
- Create: `services/retrieval-service/src/app.py`
- Create: `services/retrieval-service/tests/test_api.py`

- [ ] **Step 1: Write API endpoint tests**

```python
# services/retrieval-service/tests/test_api.py
"""Tests for FastAPI application endpoints."""

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from src.app import app


class TestHealthEndpoints:
    def test_health_endpoint(self):
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_ready_endpoint_success(self):
        with patch('src.app.SearchService') as mock_service_class:
            mock_service = Mock()
            mock_service.qdrant_client.health_check.return_value = True
            mock_service_class.return_value = mock_service

            client = TestClient(app)
            response = client.get("/ready")
            assert response.status_code == 200
            assert response.json()["status"] == "ready"
            assert response.json()["qdrant_connected"] is True

    def test_ready_endpoint_failure(self):
        with patch('src.app.SearchService') as mock_service_class:
            mock_service = Mock()
            mock_service.qdrant_client.health_check.return_value = False
            mock_service_class.return_value = mock_service

            client = TestClient(app)
            response = client.get("/ready")
            assert response.status_code == 503
            assert response.json()["status"] == "not_ready"
            assert response.json()["qdrant_connected"] is False

    def test_root_endpoint(self):
        client = TestClient(app)
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["service"] == "retrieval-service"


class TestSearchEndpoint:
    def test_search_success(self):
        with patch('src.app.SearchService') as mock_service_class:
            mock_service = Mock()
            mock_response = Mock()
            mock_response.model_dump.return_value = {
                "results": [
                    {
                        "chunk_id": "chunk-1",
                        "document_id": "doc-1",
                        "content": "test content",
                        "score": 0.95,
                        "metadata": {"project_id": "123"},
                    }
                ],
                "total": 1,
                "query_embedding_time_ms": 100,
                "search_time_ms": 10,
            }
            mock_service.search.return_value = mock_response
            mock_service_class.return_value = mock_service

            client = TestClient(app)
            response = client.post("/search", json={"query": "test query"})
            
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert len(data["results"]) == 1
            assert data["results"][0]["chunk_id"] == "chunk-1"

    def test_search_with_filters(self):
        with patch('src.app.SearchService') as mock_service_class:
            mock_service = Mock()
            mock_response = Mock()
            mock_response.model_dump.return_value = {
                "results": [],
                "total": 0,
                "query_embedding_time_ms": 50,
                "search_time_ms": 5,
            }
            mock_service.search.return_value = mock_response
            mock_service_class.return_value = mock_service

            client = TestClient(app)
            response = client.post("/search", json={
                "query": "test query",
                "filters": {
                    "must": [
                        {"key": "project_id", "match": "123"}
                    ]
                },
                "limit": 5,
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 0

    def test_search_validation_error(self):
        client = TestClient(app)
        response = client.post("/search", json={"query": "", "limit": 0})
        
        assert response.status_code == 422

    def test_search_service_error(self):
        with patch('src.app.SearchService') as mock_service_class:
            mock_service = Mock()
            mock_service.search.side_effect = Exception("Search failed")
            mock_service_class.return_value = mock_service

            client = TestClient(app)
            response = client.post("/search", json={"query": "test query"})
            
            assert response.status_code == 500
            assert "Search failed" in response.json()["detail"]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/retrieval-service && python -m pytest tests/test_api.py -v
```

Expected: FAIL - "ModuleNotFoundError: No module named 'src.app'"

- [ ] **Step 3: Write app.py**

```python
# services/retrieval-service/src/app.py
"""Retrieval Service - FastAPI Application."""

import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse

from src.config import Config
from src.models import SearchRequest, SearchResponse
from src.search import SearchService

logger = structlog.get_logger()

# Global search service instance
search_service: SearchService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Configure logging on startup."""
    config = Config.from_env()

    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, config.log_level)),
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
    )

    logger.info("Starting Retrieval Service")

    yield

    logger.info("Shutting down Retrieval Service")


app = FastAPI(
    title="Retrieval Service",
    description="Semantic search over vector database",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    """Liveness probe - returns 200 if service is running."""
    return {"status": "healthy"}


@app.get("/ready")
async def readiness_check():
    """Readiness probe - returns 200 if Qdrant is accessible."""
    config = Config.from_env()
    service = SearchService(config)

    if service.qdrant_client.health_check():
        return {
            "status": "ready",
            "qdrant_connected": True,
        }

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "not_ready",
            "qdrant_connected": False,
        },
    )


@app.get("/")
async def root():
    """Service info endpoint."""
    return {
        "service": "retrieval-service",
        "version": "1.0.0",
        "description": "Semantic search over vector database",
    }


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Perform semantic search with optional metadata filters.

    Args:
        request: Search query with filters.

    Returns:
        Search results with timing metadata.
    """
    config = Config.from_env()
    service = SearchService(config)

    try:
        response = service.search(request)
        return response
    except Exception as e:
        logger.error("Search failed", error=str(e), query=request.query[:50])
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd services/retrieval-service && python -m pytest tests/test_api.py -v
```

Expected: All 8 tests PASS

- [ ] **Step 5: Run all tests to verify no regressions**

```bash
cd services/retrieval-service && python -m pytest tests/ -v
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add services/retrieval-service/src/app.py services/retrieval-service/tests/test_api.py
git commit -m "feat(retrieval-service): add FastAPI application with search endpoint"
```

---

## Task 8: Write Entry Point

**Files:**
- Create: `services/retrieval-service/main.py`

- [ ] **Step 1: Write main.py**

```python
# services/retrieval-service/main.py
"""Retrieval Service - Entry point for local development."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("src.app:app", host="0.0.0.0", port=3000, reload=True)
```

- [ ] **Step 2: Verify app can be imported**

```bash
cd services/retrieval-service && python -c "from src.app import app; print('App imported successfully')"
```

Expected: "App imported successfully"

- [ ] **Step 3: Commit**

```bash
git add services/retrieval-service/main.py
git commit -m "feat(retrieval-service): add uvicorn entry point"
```

---

## Task 9: Write Dockerfile

**Files:**
- Create: `services/retrieval-service/Dockerfile`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
# services/retrieval-service/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY main.py .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 3000

# Run application
CMD ["python", "-m", "uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "3000"]
```

- [ ] **Step 2: Verify Dockerfile syntax**

```bash
cd services/retrieval-service && docker build -t retrieval-service:test --target=python:3.11-slim -f Dockerfile . 2>&1 | head -20
```

Or simply verify with:
```bash
cd services/retrieval-service && cat Dockerfile | grep -E "^(FROM|RUN|COPY|CMD|EXPOSE|WORKDIR|USER)"
```

Expected: Shows valid Dockerfile instructions

- [ ] **Step 3: Commit**

```bash
git add services/retrieval-service/Dockerfile
git commit -m "feat(retrieval-service): add Dockerfile with non-root user"
```

---

## Task 10: Write Documentation

**Files:**
- Create: `services/retrieval-service/README.md`

- [ ] **Step 1: Write README.md**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add services/retrieval-service/README.md
git commit -m "docs(retrieval-service): add README with API documentation"
```

---

## Self-Review

### 1. Spec Coverage Check

| Spec Section | Implementation Task | Status |
|--------------|-------------------|--------|
| Configuration (env vars) | Task 1 | ✓ |
| Pydantic models | Task 2 | ✓ |
| Filter DSL → Qdrant | Task 3 | ✓ |
| Qdrant search client | Task 4 | ✓ |
| OpenAI embedding client | Task 5 | ✓ |
| Search orchestration | Task 6 | ✓ |
| FastAPI endpoints (health, ready, search) | Task 7 | ✓ |
| Entry point | Task 8 | ✓ |
| Dockerfile | Task 9 | ✓ |
| Documentation | Task 10 | ✓ |
| **Out of scope:** Caching, batch search, async worker, metrics | N/A | ✓ |

### 2. Placeholder Scan

- No TBD/TODO/FIXME/XXX placeholders found
- All test steps include actual code
- All implementation steps include actual code
- No vague instructions like "add error handling" without specifics

### 3. Type Consistency Check

- `Config.from_env()` used consistently across app.py and search.py
- `SearchRequest`/`SearchResponse` models used in search.py and app.py
- `build_qdrant_filter` signature consistent between definition and usage
- `QdrantSearchClient.search()` parameter names match between client and service

### 4. Pattern Consistency

- Follows same structure as `embedding-service` and `document-processor`
- Uses same libraries: FastAPI, uvicorn, structlog, python-dotenv
- Same config pattern: dataclass with `from_env()` classmethod
- Same client pattern: lazy initialization with `@property`
- Same test pattern: pytest with unittest.mock

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-05-02-retrieval-service.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you prefer?
