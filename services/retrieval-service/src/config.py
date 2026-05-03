"""Retrieval Service - Configuration."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    """Service configuration loaded from environment variables."""

    # Qdrant
    qdrant_url: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    qdrant_collection: str = os.getenv("QDRANT_COLLECTION", "documents")

    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    # Sparse embedding
    sparse_embedding_model: str = os.getenv("SPARSE_EMBEDDING_MODEL", "Qdrant/bm25")

    # Service
    port: int = int(os.getenv("PORT", "3000"))
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "30"))

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "info").upper()

    @classmethod
    def from_env(cls) -> "Config":
        """Create configuration from environment variables.

        Raises:
            ValueError: If OPENAI_API_KEY is not set.
        """
        config = cls()
        if not config.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        return config
