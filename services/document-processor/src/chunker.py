"""Document Processor Service - OpenAI Semantic Chunker."""

import re
from typing import List

import numpy as np
import structlog
from openai import OpenAI

from src.config import Config

logger = structlog.get_logger()


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a_vec = np.array(a)
    b_vec = np.array(b)
    return float(np.dot(a_vec, b_vec) / (np.linalg.norm(a_vec) * np.linalg.norm(b_vec)))


def split_sentences(text: str) -> List[str]:
    """Split text into sentences."""
    # Simple sentence splitting - handles basic cases
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


class SemanticChunker:
    """Semantic text chunker using OpenAI embeddings."""

    def __init__(
        self,
        api_key: str = None,
        model: str = "text-embedding-3-small",
        max_chunk_size: int = 512,
        breakpoint_threshold: float = 0.8,
    ):
        """Initialize chunker with OpenAI client.

        Args:
            api_key: OpenAI API key. If None, reads from OPENAI_API_KEY env var.
            model: OpenAI embedding model name.
            max_chunk_size: Maximum chunk size in characters (approximate).
            breakpoint_threshold: Percentile threshold for semantic breakpoints (0-1).
        """
        config = Config.from_env()
        self.api_key = api_key or config.openai_api_key
        self.model = model or config.embedding_model
        self.max_chunk_size = max_chunk_size
        self.breakpoint_threshold = breakpoint_threshold
        self._client = OpenAI(api_key=self.api_key)
        logger.info("OpenAI semantic chunker initialized", model=self.model)

    def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a list of texts."""
        response = self._client.embeddings.create(
            model=self.model,
            input=texts,
        )
        return [item.embedding for item in response.data]

    def chunk(self, text: str) -> List[str]:
        """Split text into semantically coherent chunks.

        Args:
            text: Raw text to chunk.

        Returns:
            List of text chunks.
        """
        if not text or not text.strip():
            return []

        sentences = split_sentences(text)
        if len(sentences) <= 1:
            return [text] if text.strip() else []

        # Get embeddings for all sentences
        embeddings = self._get_embeddings(sentences)

        # Calculate similarities between adjacent sentences
        similarities = []
        for i in range(len(embeddings) - 1):
            sim = cosine_similarity(embeddings[i], embeddings[i + 1])
            similarities.append(sim)

        if not similarities:
            return [text]

        # Determine breakpoint threshold using percentile
        threshold = np.percentile(similarities, self.breakpoint_threshold * 100)

        # Group sentences into chunks
        chunks = []
        current_chunk = [sentences[0]]
        current_size = len(sentences[0])

        for i in range(1, len(sentences)):
            # Check if we should break here
            prev_sim = similarities[i - 1] if i - 1 < len(similarities) else 1.0
            new_size = current_size + len(sentences[i]) + 1  # +1 for space

            # Break if semantic similarity is low OR chunk is getting too large
            if (prev_sim < threshold and len(current_chunk) >= 2) or new_size > self.max_chunk_size * 2:
                chunks.append(" ".join(current_chunk))
                current_chunk = [sentences[i]]
                current_size = len(sentences[i])
            else:
                current_chunk.append(sentences[i])
                current_size = new_size

        # Don't forget the last chunk
        if current_chunk:
            chunks.append(" ".join(current_chunk))

        logger.info(
            "Text chunked",
            sentence_count=len(sentences),
            chunk_count=len(chunks),
            breakpoint_threshold=threshold,
        )

        return chunks
