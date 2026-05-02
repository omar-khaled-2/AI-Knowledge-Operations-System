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
