"""Shared test fixtures for retrieval-service."""

import pytest

from src.config import Config


@pytest.fixture
def test_config():
    """Provide a test configuration."""
    return Config(
        qdrant_url="http://test-qdrant:6333",
        qdrant_collection="test-collection",
        openai_api_key="test-api-key",
        embedding_model="text-embedding-3-small",
        port=3000,
        request_timeout=30,
        log_level="INFO",
    )
