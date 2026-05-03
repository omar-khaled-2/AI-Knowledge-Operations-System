"""Insight Service - Retrieval Service Client."""

import structlog
import httpx
from src.config import Config

logger = structlog.get_logger()


class RetrievalClient:
    """Client for finding similar documents via retrieval service."""

    def __init__(self, base_url: str, config: Config | None = None):
        self.base_url = base_url
        self.config = config or Config.from_env()
        self.client = httpx.Client(base_url=base_url, timeout=30.0)
        logger.info("Retrieval client initialized", base_url=base_url)

    def find_similar_documents(
        self,
        project_id: str,
        exclude_document_id: str,
        query_text: str,
        limit: int = 5,
    ) -> list[dict]:
        """Find documents similar to the given text.

        Args:
            project_id: Project ID to filter results by.
            exclude_document_id: Document ID to exclude from results.
            query_text: Text to search for similar documents.
            limit: Maximum number of similar documents to return.

        Returns:
            List of similar documents with document_id, content, and score.
        """
        url = "/search/similar-documents"
        payload = {
            "project_id": project_id,
            "exclude_document_id": exclude_document_id,
            "query_text": query_text,
            "limit": limit,
        }

        logger.info(
            "Finding similar documents via retrieval service",
            project_id=project_id,
            exclude_document_id=exclude_document_id,
            query_length=len(query_text),
            limit=limit,
        )

        try:
            response = self.client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            docs = result.get("results", [])

            logger.info(
                "Similar documents found",
                project_id=project_id,
                count=len(docs),
            )
            return docs
        except httpx.HTTPError as e:
            logger.error("Failed to find similar documents", error=str(e))
            raise

    def close(self) -> None:
        """Close the HTTP client."""
        self.client.close()
