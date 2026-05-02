"""Tests for OpenAI embedding client."""

from unittest.mock import Mock, patch

import pytest

from src.openai_client import OpenAIEmbeddingClient


class TestOpenAIEmbeddingClient:
    def test_init(self, test_config):
        client = OpenAIEmbeddingClient(test_config.openai_api_key, test_config.embedding_model)
        assert client.api_key == test_config.openai_api_key
        assert client.model == test_config.embedding_model
        assert client._client is None

    def test_embed(self, test_config):
        with patch('src.openai_client.OpenAI') as mock_openai_class:
            mock_client = Mock()
            mock_openai_class.return_value = mock_client

            # Mock embeddings.create response
            mock_embedding = Mock()
            mock_embedding.embedding = [0.1] * 384
            mock_response = Mock()
            mock_response.data = [mock_embedding]
            mock_client.embeddings.create.return_value = mock_response

            client = OpenAIEmbeddingClient(test_config.openai_api_key, test_config.embedding_model)
            result = client.embed("test query")

            assert len(result) == 384
            assert result[0] == 0.1
            mock_client.embeddings.create.assert_called_once_with(
                input="test query",
                model=test_config.embedding_model,
            )

    def test_embed_empty_text(self, test_config):
        with patch('src.openai_client.OpenAI') as mock_openai_class:
            mock_client = Mock()
            mock_openai_class.return_value = mock_client

            mock_embedding = Mock()
            mock_embedding.embedding = [0.0] * 384
            mock_response = Mock()
            mock_response.data = [mock_embedding]
            mock_client.embeddings.create.return_value = mock_response

            client = OpenAIEmbeddingClient(test_config.openai_api_key, test_config.embedding_model)
            result = client.embed("")

            assert len(result) == 384

    def test_embed_api_error(self, test_config):
        with patch('src.openai_client.OpenAI') as mock_openai_class:
            mock_client = Mock()
            mock_openai_class.return_value = mock_client
            mock_client.embeddings.create.side_effect = Exception("API Error")

            client = OpenAIEmbeddingClient(test_config.openai_api_key, test_config.embedding_model)
            
            with pytest.raises(Exception, match="API Error"):
                client.embed("test query")