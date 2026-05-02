"""Retrieval Service - OpenAI Embedding Client."""

from typing import List

import structlog
from openai import OpenAI

logger = structlog.get_logger()


class OpenAIEmbeddingClient:
    """Client for generating query embeddings via OpenAI."""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small", timeout: int = 30):
        """Initialize OpenAI embedding client.

        Args:
            api_key: OpenAI API key.
            model: Embedding model name.
            timeout: Request timeout in seconds.
        """
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self._client = None

    @property
    def client(self) -> OpenAI:
        """Lazy initialization of OpenAI client."""
        if self._client is None:
            self._client = OpenAI(api_key=self.api_key, timeout=self.timeout)
        return self._client

    def close(self) -> None:
        """Close the OpenAI client connection."""
        if self._client is not None:
            self._client.close()
            self._client = None

    def embed(self, text: str) -> List[float]:
        """Generate embedding for text.

        Args:
            text: Text to embed.

        Returns:
            Embedding vector.

        Raises:
            Exception: If OpenAI API call fails.
        """
        logger.debug("Generating embedding", text_length=len(text))

        response = self.client.embeddings.create(
            input=text,
            model=self.model,
        )

        embedding = response.data[0].embedding

        logger.debug("Embedding generated", vector_dim=len(embedding))

        return embedding