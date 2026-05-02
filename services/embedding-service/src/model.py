"""Embedding Service - OpenAI Embedding Client."""

from typing import List

import structlog
from openai import OpenAI

from src.config import Config

logger = structlog.get_logger()


class EmbeddingModel:
    """OpenAI embedding client wrapper."""

    def __init__(self, api_key: str = None, model: str = None):
        """Initialize OpenAI client.

        Args:
            api_key: OpenAI API key. If None, reads from OPENAI_API_KEY env var.
            model: OpenAI embedding model name.
        """
        config = Config.from_env()
        self.api_key = api_key or config.openai_api_key
        self.model = model or config.embedding_model
        self._client = OpenAI(api_key=self.api_key)
        logger.info("OpenAI embedding client initialized", model=self.model)

    def embed(self, text: str) -> List[float]:
        """Embed a single text.

        Args:
            text: Text to embed.

        Returns:
            Embedding vector as list of floats.
        """
        response = self._client.embeddings.create(
            model=self.model,
            input=text,
        )
        return response.data[0].embedding

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple texts.

        Args:
            texts: List of texts to embed.

        Returns:
            List of embedding vectors.
        """
        response = self._client.embeddings.create(
            model=self.model,
            input=texts,
        )
        return [item.embedding for item in response.data]
