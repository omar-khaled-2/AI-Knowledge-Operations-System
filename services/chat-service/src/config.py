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

    # OpenAI / LLM
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str | None = None

    # Service
    port: int = 3000
    host: str = "0.0.0.0"

    # Logging
    log_level: str = "info"

    class Config:
        env_file = ".env"
        env_prefix = ""
        case_sensitive = False
