"""Retrieval Service - OpenAI Embedding Client."""

from typing import List

import structlog
from openai import OpenAI

logger = structlog.get_logger()


class OpenAIEmbeddingClient:
    """Client for generating query embeddings via OpenAI."""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        """Initialize OpenAI embedding client.

        Args:
            api_key: OpenAI API key.
            model: Embedding model name.
        """
        self.api_key = api_key
        self.model = model
        self._client = None

    @property
    def client(self) -> OpenAI:
        """Lazy initialization of OpenAI client."""
        if self._client is None:
            self._client = OpenAI(api_key=self.api_key)
        return self._client

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