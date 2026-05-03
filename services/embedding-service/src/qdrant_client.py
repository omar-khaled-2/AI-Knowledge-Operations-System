"""Embedding Service - Qdrant Client."""

from typing import List, Dict, Any

import structlog
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, SparseVector

logger = structlog.get_logger()


class QdrantVectorClient:
    """Client for upserting vectors to Qdrant."""

    def __init__(self, url: str, collection_name: str):
        """Initialize Qdrant client.

        Args:
            url: Qdrant server URL.
            collection_name: Name of the collection to upsert to.
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

    def ensure_collection(self, vector_size: int = 1536) -> None:
        """Ensure collection exists, create if not.

        Args:
            vector_size: Dimension of vectors.
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

    def upsert_chunks(self, points: List[Dict[str, Any]]) -> None:
        """Upsert chunk vectors to Qdrant.

        Args:
            points: List of points with 'id', 'vector', and 'payload' keys.
        """
        qdrant_points = []
        for p in points:
            vector_data = p["vector"]
            
            # Build vector dict
            vectors = {}
            if isinstance(vector_data, dict):
                if "dense" in vector_data:
                    vectors["dense"] = vector_data["dense"]
                if "sparse" in vector_data:
                    sparse = vector_data["sparse"]
                    vectors["sparse"] = SparseVector(
                        indices=sparse["indices"].tolist(),
                        values=sparse["values"].tolist(),
                    )
            else:
                # Backward compatibility: vector is a plain list
                vectors = vector_data
            
            qdrant_points.append(
                PointStruct(
                    id=p["id"],
                    vector=vectors,
                    payload=p["payload"],
                )
            )

        self.client.upsert(
            collection_name=self.collection_name,
            points=qdrant_points,
        )
        logger.info("Upserted chunks", count=len(points), collection=self.collection_name)
