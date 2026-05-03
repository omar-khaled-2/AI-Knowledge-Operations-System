"""Embedding Service - Configuration."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    """Service configuration loaded from environment variables."""

    # RabbitMQ
    rabbitmq_url: str = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
    rabbitmq_exchange: str = os.getenv("RABBITMQ_EXCHANGE", "documents")
    rabbitmq_queue: str = os.getenv("RABBITMQ_EMBEDDING_QUEUE", "embedding-jobs")
    rabbitmq_routing_key: str = os.getenv("RABBITMQ_EMBEDDING_ROUTING_KEY", "chunk.embed")

    # Qdrant
    qdrant_url: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    qdrant_collection: str = os.getenv("QDRANT_COLLECTION", "documents")

    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    # Sparse embedding model
    sparse_embedding_model: str = os.getenv("SPARSE_EMBEDDING_MODEL", "Qdrant/bm25")

    # Redis for chunk tracking
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # Backend API URL for status updates
    backend_url: str = os.getenv("BACKEND_URL", "")

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "info").upper()

    @classmethod
    def from_env(cls) -> "Config":
        """Create configuration from environment variables."""
        return cls()
