from typing import List

from langchain_experimental.text_splitter import SemanticChunker as LCSemanticChunker
from langchain_community.embeddings import HuggingFaceEmbeddings


class SemanticChunker:
    """Semantic text chunker using LangChain's SemanticChunker."""

    def __init__(self, model_name: str, max_chunk_size: int = 512):
        """Initialize chunker with embedding model.

        Args:
            model_name: HuggingFace model name for embeddings (e.g., 'sentence-transformers/all-MiniLM-L6-v2')
            max_chunk_size: Maximum chunk size in characters (approximate).
        """
        self.model_name = model_name
        self.max_chunk_size = max_chunk_size
        embeddings = HuggingFaceEmbeddings(model_name=model_name)
        self.chunker = LCSemanticChunker(
            embeddings=embeddings,
            breakpoint_threshold_type="percentile",
            breakpoint_threshold_amount=0.8,
        )

    def chunk(self, text: str) -> List[str]:
        """Split text into semantically coherent chunks.

        Args:
            text: Raw text to chunk.

        Returns:
            List of text chunks.
        """
        if not text or not text.strip():
            return []

        documents = self.chunker.create_documents([text])
        return [doc.page_content for doc in documents]
