import structlog
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

logger = structlog.get_logger()

class QdrantInsightClient:
    """Client for reading document chunks from Qdrant."""

    def __init__(self, url: str, collection_name: str):
        self.url = url
        self.collection_name = collection_name
        self._client = None

    @property
    def client(self) -> QdrantClient:
        """Lazy initialization of Qdrant client."""
        if self._client is None:
            self._client = QdrantClient(url=self.url)
        return self._client

    def get_document_chunks(self, document_id: str, limit: int = 100) -> list[str]:
        """Get all chunks for a specific document."""
        logger.info("Fetching document chunks", document_id=document_id)

        results, _ = self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
            limit=limit,
        )

        chunks = [point.payload.get("text", "") for point in results]
        logger.info(f"Found {len(chunks)} chunks", document_id=document_id)
        return chunks
