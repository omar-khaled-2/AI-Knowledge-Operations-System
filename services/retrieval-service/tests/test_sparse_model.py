"""Tests for sparse vector generation in retrieval service."""

import pytest
from src.sparse_model import SparseEmbeddingModel


def test_sparse_model_embeds_query():
    """Sparse model should return indices and values for query."""
    model = SparseEmbeddingModel()
    result = model.embed("what is my job")
    
    assert result.indices is not None
    assert result.values is not None
    assert len(result.indices) > 0
    assert len(result.values) > 0


def test_sparse_model_empty_query():
    """Empty query should return empty sparse vector."""
    model = SparseEmbeddingModel()
    result = model.embed("")
    
    assert len(result.indices) == 0
    assert len(result.values) == 0
