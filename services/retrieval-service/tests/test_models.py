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
