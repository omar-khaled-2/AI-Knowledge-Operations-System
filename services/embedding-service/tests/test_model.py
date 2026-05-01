import pytest
from src.model import EmbeddingModel


def test_model_loads_and_embeds():
    model = EmbeddingModel("sentence-transformers/all-MiniLM-L6-v2")
    text = "Hello world"
    embedding = model.embed(text)

    assert isinstance(embedding, list)
    assert len(embedding) == 384
    assert all(isinstance(x, float) for x in embedding)


def test_model_embeds_batch():
    model = EmbeddingModel("sentence-transformers/all-MiniLM-L6-v2")
    texts = ["Hello world", "Test sentence"]
    embeddings = model.embed_batch(texts)

    assert len(embeddings) == 2
    assert len(embeddings[0]) == 384
    assert len(embeddings[1]) == 384
