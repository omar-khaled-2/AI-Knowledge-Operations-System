import pytest
from src.chunker import SemanticChunker


def test_chunker_splits_text():
    chunker = SemanticChunker("sentence-transformers/all-MiniLM-L6-v2")
    text = "First sentence about AI. Second sentence about ML. Third sentence about NLP."
    chunks = chunker.chunk(text)

    assert isinstance(chunks, list)
    assert len(chunks) > 0
    assert all(isinstance(c, str) for c in chunks)


def test_chunker_preserves_content():
    chunker = SemanticChunker("sentence-transformers/all-MiniLM-L6-v2")
    text = "Hello world. This is a test."
    chunks = chunker.chunk(text)

    combined = " ".join(chunks)
    assert "Hello" in combined
    assert "test" in combined
