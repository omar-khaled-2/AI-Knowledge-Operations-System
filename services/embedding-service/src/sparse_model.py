"""Sparse vector generation using fastembed BM25."""

from dataclasses import dataclass

import numpy as np
from fastembed.sparse import SparseTextEmbedding


@dataclass
class SparseVector:
    """Sparse vector representation."""
    
    indices: np.ndarray
    values: np.ndarray


class SparseEmbeddingModel:
    """Generates BM25 sparse vectors for text."""
    
    def __init__(self, model_name: str = "Qdrant/bm25"):
        try:
            self.model = SparseTextEmbedding(model_name)
        except Exception as e:
            raise ValueError(f"Failed to initialize sparse embedding model '{model_name}': {e}")
    
    def embed(self, text: str) -> SparseVector:
        """Generate sparse vector for text.
        
        Args:
            text: Input text.
            
        Returns:
            SparseVector with indices and values.
            
        Raises:
            ValueError: If text is None.
            RuntimeError: If embedding generation fails.
        """
        if text is None:
            raise ValueError("Input text cannot be None")
        
        if not text.strip():
            return SparseVector(indices=np.array([], dtype=np.int32), values=np.array([], dtype=np.float32))
        
        try:
            embeddings = list(self.model.embed(text))
        except Exception as e:
            raise RuntimeError(f"Failed to generate sparse embedding: {e}")
        
        if not embeddings:
            return SparseVector(indices=np.array([], dtype=np.int32), values=np.array([], dtype=np.float32))
        
        sparse = embeddings[0]
        return SparseVector(
            indices=sparse.indices.astype(np.int32),
            values=sparse.values.astype(np.float32),
        )
