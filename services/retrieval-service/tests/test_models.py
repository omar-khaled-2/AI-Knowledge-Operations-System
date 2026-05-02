"""Tests for Pydantic models."""

import pytest
from pydantic import ValidationError

from src.models import FilterCondition, SearchFilters, SearchRequest, SearchResponse, SearchResult


class TestFilterCondition:
    def test_valid_filter_condition_with_match(self):
        condition = FilterCondition(key="project_id", match="123")
        assert condition.key == "project_id"
        assert condition.match == "123"
        assert condition.match_any is None
        assert condition.range is None

    def test_valid_filter_condition_with_match_any(self):
        condition = FilterCondition(key="status", match_any=["active", "pending"])
        assert condition.key == "status"
        assert condition.match is None
        assert condition.match_any == ["active", "pending"]

    def test_valid_filter_condition_with_range(self):
        condition = FilterCondition(key="created_at", range={"gte": "2024-01-01", "lte": "2024-12-31"})
        assert condition.key == "created_at"
        assert condition.range == {"gte": "2024-01-01", "lte": "2024-12-31"}

    def test_filter_condition_empty(self):
        condition = FilterCondition(key="test")
        assert condition.match is None
        assert condition.match_any is None
        assert condition.range is None


class TestSearchFilters:
    def test_empty_filters(self):
        filters = SearchFilters()
        assert filters.must == []
        assert filters.should == []
        assert filters.must_not == []

    def test_filters_with_conditions(self):
        filters = SearchFilters(
            must=[FilterCondition(key="project_id", match="123")],
            should=[FilterCondition(key="title", match="test")],
        )
        assert len(filters.must) == 1
        assert filters.must[0].key == "project_id"
        assert len(filters.should) == 1
        assert filters.should[0].key == "title"
        assert filters.must_not == []

    def test_filters_none_lists(self):
        filters = SearchFilters(must=None, should=None, must_not=None)
        assert filters.must is None
        assert filters.should is None
        assert filters.must_not is None


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

    def test_score_validation_negative(self):
        with pytest.raises(ValidationError):
            SearchResult(
                chunk_id="test",
                document_id="test",
                content="test",
                score=-0.1,
                metadata={},
            )

    def test_score_validation_zero(self):
        result = SearchResult(
            chunk_id="test",
            document_id="test",
            content="test",
            score=0.0,
            metadata={},
        )
        assert result.score == 0.0


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

    def test_query_embedding_time_validation_negative(self):
        with pytest.raises(ValidationError):
            SearchResponse(
                results=[],
                total=0,
                query_embedding_time_ms=-1,
                search_time_ms=10,
            )

    def test_search_time_validation_negative(self):
        with pytest.raises(ValidationError):
            SearchResponse(
                results=[],
                total=0,
                query_embedding_time_ms=100,
                search_time_ms=-1,
            )

    def test_timing_fields_zero(self):
        response = SearchResponse(
            results=[],
            total=0,
            query_embedding_time_ms=0,
            search_time_ms=0,
        )
        assert response.query_embedding_time_ms == 0
        assert response.search_time_ms == 0
