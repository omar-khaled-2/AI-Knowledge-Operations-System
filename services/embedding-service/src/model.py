"""Embedding Service - Model Loader."""

from typing import List

import structlog
from sentence_transformers import SentenceTransformer

logger = structlog.get_logger()


class EmbeddingModel:
    """Singleton wrapper for sentence-transformers model."""

    _instance = None
    _model = None

    def __new__(cls, model_name: str):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize(model_name)
        return cls._instance

    def _initialize(self, model_name: str):
        """Load the embedding model.

        Args:
            model_name: HuggingFace model name.
        """
        self.model_name = model_name
        logger.info("Loading embedding model", model_name=model_name)
        self._model = SentenceTransformer(model_name)
        logger.info("Model loaded successfully", model_name=model_name)

    def embed(self, text: str) -> List[float]:
        """Embed a single text.

        Args:
            text: Text to embed.

        Returns:
            Embedding vector as list of floats.
        """
        embedding = self._model.encode(text)
        return embedding.tolist()

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple texts.

        Args:
            texts: List of texts to embed.

        Returns:
            List of embedding vectors.
        """
        embeddings = self._model.encode(texts)
        return [e.tolist() for e in embeddings]
