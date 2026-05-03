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

    def search_similar_documents(
        self,
        project_id: str,
        exclude_document_id: str,
        query_vector: list[float],
        limit: int = 5,
    ) -> list[dict]:
        """Search for similar documents in the same project."""
        logger.info("Searching similar documents", project_id=project_id)

        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="project_id",
                        match=MatchValue(value=project_id),
                    )
                ],
                must_not=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=exclude_document_id),
                    )
                ],
            ),
            limit=limit,
        )

        docs = []
        for point in results:
            docs.append({
                "document_id": point.payload.get("document_id"),
                "text": point.payload.get("text", ""),
                "score": point.score,
            })

        logger.info(f"Found {len(docs)} similar documents", project_id=project_id)
        return docs
