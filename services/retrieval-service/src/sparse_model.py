"""Sparse vector generation for retrieval queries."""

from dataclasses import dataclass

import numpy as np
from fastembed.sparse import SparseTextEmbedding


@dataclass
class SparseVector:
    """Sparse vector representation."""
    
    indices: np.ndarray
    values: np.ndarray


class SparseEmbeddingModel:
    """Generates BM25 sparse vectors for search queries."""
    
    def __init__(self, model_name: str = "Qdrant/bm25"):
        self.model = SparseTextEmbedding(model_name)
    
    def embed(self, text: str) -> SparseVector:
        """Generate sparse vector for text."""
        if not text or not text.strip():
            return SparseVector(
                indices=np.array([], dtype=np.int32),
                values=np.array([], dtype=np.float32),
            )
        
        embeddings = list(self.model.embed(text))
        if not embeddings:
            return SparseVector(
                indices=np.array([], dtype=np.int32),
                values=np.array([], dtype=np.float32),
            )
        
        sparse = embeddings[0]
        return SparseVector(
            indices=sparse.indices.astype(np.int32),
            values=sparse.values.astype(np.float32),
        )
