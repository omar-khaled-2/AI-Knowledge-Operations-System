import pytest
from unittest.mock import Mock, patch
from src.model import EmbeddingModel


def test_model_embeds_single():
    mock_response = Mock()
    mock_response.data = [Mock(embedding=[0.1, 0.2, 0.3])]

    with patch("src.model.OpenAI") as mock_openai_class:
        mock_client = Mock()
        mock_client.embeddings.create.return_value = mock_response
        mock_openai_class.return_value = mock_client

        model = EmbeddingModel(api_key="test-key", model="text-embedding-3-small")
        embedding = model.embed("Hello world")

        assert isinstance(embedding, list)
        assert len(embedding) == 3
        assert all(isinstance(x, float) for x in embedding)
        mock_client.embeddings.create.assert_called_once_with(
            model="text-embedding-3-small",
            input="Hello world",
        )


def test_model_embeds_batch():
    mock_response = Mock()
    mock_response.data = [
        Mock(embedding=[0.1, 0.2]),
        Mock(embedding=[0.3, 0.4]),
    ]

    with patch("src.model.OpenAI") as mock_openai_class:
        mock_client = Mock()
        mock_client.embeddings.create.return_value = mock_response
        mock_openai_class.return_value = mock_client

        model = EmbeddingModel(api_key="test-key", model="text-embedding-3-small")
        embeddings = model.embed_batch(["Hello world", "Test sentence"])

        assert len(embeddings) == 2
        assert len(embeddings[0]) == 2
        assert len(embeddings[1]) == 2
        mock_client.embeddings.create.assert_called_once_with(
            model="text-embedding-3-small",
            input=["Hello world", "Test sentence"],
        )
