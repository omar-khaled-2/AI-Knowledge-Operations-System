"""Document Processor Service - Configuration."""

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
    rabbitmq_queue: str = os.getenv("RABBITMQ_DOCUMENT_QUEUE", "document-jobs")
    rabbitmq_routing_key: str = os.getenv("RABBITMQ_ROUTING_KEY", "document.created")
    embedding_routing_key: str = os.getenv("RABBITMQ_EMBEDDING_ROUTING_KEY", "chunk.embed")

    # AWS
    aws_region: str = os.getenv("AWS_REGION", "eu-west-3")
    s3_bucket_name: str = os.getenv("S3_BUCKET_NAME", "lalo-documents-omar")

    # Qdrant
    qdrant_url: str = os.getenv("QDRANT_URL", "http://localhost:6333")

    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    # Chunking
    max_chunk_size: int = int(os.getenv("MAX_CHUNK_SIZE", "512"))

    # Backend API URL for status updates
    backend_url: str = os.getenv("BACKEND_URL", "")

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "info").upper()

    @classmethod
    def from_env(cls) -> "Config":
        """Create configuration from environment variables."""
        return cls()
