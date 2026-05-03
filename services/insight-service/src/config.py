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
    rabbitmq_queue: str = os.getenv("RABBITMQ_QUEUE", "insight-jobs")
    rabbitmq_routing_key: str = os.getenv("RABBITMQ_ROUTING_KEY", "document.embedded")

    # Qdrant
    qdrant_url: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    qdrant_collection: str = os.getenv("QDRANT_COLLECTION", "documents")

    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Backend
    backend_url: str = os.getenv("BACKEND_URL", "http://localhost:3001")
    backend_internal_api_key: str = os.getenv("BACKEND_INTERNAL_API_KEY", "")

    # Retrieval Service
    retrieval_service_url: str = os.getenv("RETRIEVAL_SERVICE_URL", "http://localhost:3000")

    # Service
    log_level: str = os.getenv("LOG_LEVEL", "info").upper()

    @classmethod
    def from_env(cls) -> "Config":
        """Create configuration from environment variables."""
        return cls()
