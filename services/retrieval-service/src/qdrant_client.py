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
        dense_vector: List[float],
        sparse_vector: Any,
        limit: int = 10,
        offset: int = 0,
        filter_obj: Optional[Any] = None,
        score_threshold: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """Search for similar vectors using hybrid dense + sparse.
        
        Args:
            dense_vector: Dense query embedding.
            sparse_vector: Sparse query vector (SparseVector dataclass).
            limit: Maximum number of results.
            offset: Pagination offset.
            filter_obj: Qdrant Filter object.
            score_threshold: Minimum similarity score.
            
        Returns:
            List of search results with id, score, and payload.
        """
        from qdrant_client import models
        
        # Convert sparse vector to Qdrant format
        sparse_query = models.SparseVector(
            indices=sparse_vector.indices.tolist(),
            values=sparse_vector.values.tolist(),
        )
        
        # Execute hybrid search with prefetch + fusion
        response = self.client.query_points(
            collection_name=self.collection_name,
            prefetch=[
                models.Prefetch(
                    query=dense_vector,
                    using="dense",
                    limit=limit * 2,
                ),
                models.Prefetch(
                    query=sparse_query,
                    using="sparse",
                    limit=limit * 2,
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=limit,
            offset=offset,
            query_filter=filter_obj,
            score_threshold=score_threshold,
        )

        logger.info(
            "Qdrant hybrid search completed",
            collection=self.collection_name,
            limit=limit,
            results_count=len(response.points),
        )

        return [
            {
                "id": str(point.id),
                "score": point.score,
                "payload": point.payload,
            }
            for point in response.points
        ]

    def ensure_collection(self, vector_size: int = 1536) -> None:
        """Ensure collection exists, create with hybrid support if not.
        
        Args:
            vector_size: Dimension of dense vectors.
        """
        from qdrant_client.models import Distance, VectorParams, SparseVectorParams
        
        try:
            self.client.get_collection(self.collection_name)
            logger.info("Collection exists", collection=self.collection_name)
        except Exception:
            logger.info("Creating collection with hybrid support", collection=self.collection_name)
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config={
                    "dense": VectorParams(size=vector_size, distance=Distance.COSINE),
                },
                sparse_vectors_config={
                    "sparse": SparseVectorParams(),
                },
            )
            logger.info("Collection created with hybrid support", collection=self.collection_name)

    def close(self) -> None:
        """Close the Qdrant client connection."""
        if self._client is not None:
            self._client.close()
            self._client = None

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
