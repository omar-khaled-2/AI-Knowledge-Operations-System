"""Chat Service - Configuration."""

from pydantic_settings import BaseSettings


class Config(BaseSettings):
    """Service configuration loaded from environment variables."""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Backend API
    backend_url: str = "http://localhost:3001"
    backend_timeout: float = 10.0

    # Retrieval Service
    retrieval_service_url: str = "http://localhost:3000"
    retrieval_timeout: float = 10.0

    # Service
    port: int = 3000
    host: str = "0.0.0.0"

    # Logging
    log_level: str = "info"

    # AI Stub
    chunk_delay_ms: float = 100.0

    class Config:
        env_file = ".env"
        env_prefix = ""
        case_sensitive = False
