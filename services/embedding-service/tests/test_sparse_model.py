"""Tests for sparse vector generation."""

import pytest
from src.sparse_model import SparseEmbeddingModel


def test_sparse_model_embeds_text():
    """Sparse model should return indices and values."""
    model = SparseEmbeddingModel()
    result = model.embed("Backend Engineer at Osus Prog")
    
    assert result.indices is not None
    assert result.values is not None
    assert len(result.indices) > 0
    assert len(result.values) > 0
    assert len(result.indices) == len(result.values)


def test_sparse_model_different_texts():
    """Different texts should produce different sparse vectors."""
    model = SparseEmbeddingModel()
    result1 = model.embed("hello world")
    result2 = model.embed("goodbye moon")
    
    assert not (result1.indices == result2.indices).all()


def test_sparse_model_empty_text():
    """Empty text should return empty sparse vector."""
    model = SparseEmbeddingModel()
    result = model.embed("")
    
    assert len(result.indices) == 0
    assert len(result.values) == 0


def test_sparse_model_whitespace_text():
    """Whitespace-only text should return empty sparse vector."""
    model = SparseEmbeddingModel()
    result = model.embed("   ")
    
    assert len(result.indices) == 0
    assert len(result.values) == 0


def test_sparse_model_none_text():
    """None input should raise ValueError."""
    model = SparseEmbeddingModel()
    with pytest.raises(ValueError, match="cannot be None"):
        model.embed(None)
