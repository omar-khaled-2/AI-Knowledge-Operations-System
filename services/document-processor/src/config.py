"""Document Processor Service - Configuration."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    """Service configuration loaded from environment variables."""

    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    stream_key: str = os.getenv("REDIS_STREAM_KEY", "documents:events")

    # AWS
    aws_region: str = os.getenv("AWS_REGION", "eu-west-3")
    s3_bucket_name: str = os.getenv("S3_BUCKET_NAME", "lalo-documents-omar")

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "info").upper()

    @classmethod
    def from_env(cls) -> "Config":
        """Create configuration from environment variables."""
        return cls()
