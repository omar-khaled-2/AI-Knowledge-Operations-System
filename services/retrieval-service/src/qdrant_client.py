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
