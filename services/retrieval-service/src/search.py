"""Retrieval Service - Search Logic."""

import asyncio
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
from src.models import (
    FilterCondition,
    SearchFilters,
    SearchRequest,
    SearchResponse,
    SearchResult,
    SimilarDocumentsRequest,
    SimilarDocumentsResponse,
    SimilarDocumentResult,
)
from src.openai_client import OpenAIEmbeddingClient
from src.qdrant_client import QdrantSearchClient
from src.sparse_model import SparseEmbeddingModel

logger = structlog.get_logger()


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


class SearchService:
    """Orchestrates hybrid semantic search: embed query → search Qdrant → format results."""

    def __init__(
        self,
        config: Config,
        openai_client: Optional[OpenAIEmbeddingClient] = None,
        qdrant_client: Optional[QdrantSearchClient] = None,
        sparse_model: Optional[SparseEmbeddingModel] = None,
    ):
        """Initialize search service with clients.

        Args:
            config: Service configuration.
            openai_client: Optional pre-configured OpenAI embedding client.
            qdrant_client: Optional pre-configured Qdrant search client.
            sparse_model: Optional pre-configured sparse embedding model.
        """
        self.config = config
        self.openai_client = openai_client or OpenAIEmbeddingClient(
            api_key=config.openai_api_key,
            model=config.embedding_model,
            timeout=config.request_timeout,
        )
        self.qdrant_client = qdrant_client or QdrantSearchClient(
            url=config.qdrant_url,
            collection_name=config.qdrant_collection,
        )
        self._sparse_model = sparse_model

    @property
    def sparse_model(self) -> SparseEmbeddingModel:
        """Lazy initialization of sparse model."""
        if self._sparse_model is None:
            self._sparse_model = SparseEmbeddingModel(
                model_name=getattr(self.config, 'sparse_embedding_model', 'Qdrant/bm25')
            )
        return self._sparse_model

    async def search(self, request: SearchRequest) -> SearchResponse:
        """Execute hybrid semantic search.

        Args:
            request: Search request with query and filters.

        Returns:
            Search response with results and timing.
        """
        logger.info(
            "Starting hybrid search",
            query=request.query[:50],
            limit=request.limit,
        )

        # Generate query embeddings (offload blocking calls to threads)
        embed_start = time.time()
        dense_vector = await asyncio.to_thread(self.openai_client.embed, request.query)
        sparse_vector = await asyncio.to_thread(self.sparse_model.embed, request.query)
        embed_time_ms = int((time.time() - embed_start) * 1000)

        logger.debug(
            "Query embedded",
            dense_dim=len(dense_vector),
            sparse_dim=len(sparse_vector.indices),
            time_ms=embed_time_ms,
        )

        # Build Qdrant filter
        filters = request.filters or SearchFilters()
        
        # Auto-add project_id filter if provided
        if request.project_id:
            logger.info("Filtering by project_id", project_id=request.project_id)
            project_condition = FilterCondition(
                key="project_id",
                match=request.project_id,
            )
            if filters.must is None:
                filters.must = []
            filters.must.append(project_condition)
        
        filter_obj = build_qdrant_filter(filters)

        # Search Qdrant (hybrid)
        search_start = time.time()
        raw_results = self.qdrant_client.search(
            dense_vector=dense_vector,
            sparse_vector=sparse_vector,
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

    async def find_similar_documents(
        self,
        project_id: str,
        exclude_document_id: str,
        query_text: str,
        limit: int = 5,
    ) -> SimilarDocumentsResponse:
        """Find documents similar to the given text within a project.

        Args:
            project_id: Project ID to filter results by.
            exclude_document_id: Document ID to exclude from results.
            query_text: Text to search for similar documents.
            limit: Maximum number of similar documents to return.

        Returns:
            SimilarDocumentsResponse with grouped results by document.
        """
        logger.info(
            "Finding similar documents",
            project_id=project_id,
            exclude_document_id=exclude_document_id,
            query_length=len(query_text),
            limit=limit,
        )

        # Generate query embeddings
        embed_start = time.time()
        dense_vector = await asyncio.to_thread(self.openai_client.embed, query_text)
        sparse_vector = await asyncio.to_thread(self.sparse_model.embed, query_text)
        embed_time_ms = int((time.time() - embed_start) * 1000)

        # Build filter: must match project_id, must not match exclude_document_id
        filter_obj = Filter(
            must=[
                FieldCondition(
                    key="project_id",
                    match=MatchValue(value=project_id),
                ),
            ],
            must_not=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=exclude_document_id),
                ),
            ],
        )

        # Search Qdrant (hybrid)
        search_start = time.time()
        raw_results = self.qdrant_client.search(
            dense_vector=dense_vector,
            sparse_vector=sparse_vector,
            limit=limit * 3,  # Fetch more to allow for document grouping
            filter_obj=filter_obj,
        )
        search_time_ms = int((time.time() - search_start) * 1000)

        # Group results by document_id, keep highest scoring chunk per document
        document_scores: dict[str, tuple[float, str]] = {}
        for result in raw_results:
            payload = result.get("payload", {})
            doc_id = payload.get("document_id", "")
            if not doc_id:
                continue
            score = result["score"]
            text = payload.get("text", "")
            if doc_id not in document_scores or score > document_scores[doc_id][0]:
                document_scores[doc_id] = (score, text)

        # Build response
        results = [
            SimilarDocumentResult(
                document_id=doc_id,
                content=text,
                score=score,
            )
            for doc_id, (score, text) in sorted(
                document_scores.items(),
                key=lambda x: x[1][0],
                reverse=True,
            )[:limit]
        ]

        logger.info(
            "Similar documents found",
            project_id=project_id,
            chunks_found=len(raw_results),
            documents_found=len(results),
            embed_time_ms=embed_time_ms,
            search_time_ms=search_time_ms,
        )

        return SimilarDocumentsResponse(
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
                document_id=(payload := result.get("payload", {})).get("document_id", ""),
                content=payload.get("text", ""),
                score=result["score"],
                metadata={
                    k: v
                    for k, v in payload.items()
                    if k not in ("text", "document_id")
                },
            )
            for result in raw_results
        ]
