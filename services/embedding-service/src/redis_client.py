"""Embedding Service - Redis client for chunk tracking."""

import redis
import structlog

from src.config import Config

logger = structlog.get_logger()


class ChunkTracker:
    """Tracks chunk embedding progress per document using Redis."""

    def __init__(self, config: Config = None):
        self.config = config or Config.from_env()
        self.client = redis.from_url(self.config.redis_url, decode_responses=True)

    def _key(self, document_id: str) -> str:
        return f"embedding:chunks:{document_id}"

    def mark_chunk_embedded(self, document_id: str, total_chunks: int) -> int:
        """Mark a chunk as embedded and return the new count.

        Args:
            document_id: Document UUID.
            total_chunks: Total number of chunks for the document.

        Returns:
            Number of chunks embedded so far.
        """
        key = self._key(document_id)
        count = self.client.incr(key)
        logger.debug(
            "Chunk marked as embedded",
            document_id=document_id,
            count=count,
            total_chunks=total_chunks,
        )
        return count

    def is_complete(self, document_id: str, total_chunks: int) -> bool:
        """Check if all chunks have been embedded.

        Args:
            document_id: Document UUID.
            total_chunks: Total number of chunks for the document.

        Returns:
            True if all chunks are embedded.
        """
        key = self._key(document_id)
        count = int(self.client.get(key) or 0)
        return count >= total_chunks

    def cleanup(self, document_id: str) -> None:
        """Remove tracking data for a document.

        Args:
            document_id: Document UUID.
        """
        key = self._key(document_id)
        self.client.delete(key)
        logger.debug("Cleaned up chunk tracking", document_id=document_id)
