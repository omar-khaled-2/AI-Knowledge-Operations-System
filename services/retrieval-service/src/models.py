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
