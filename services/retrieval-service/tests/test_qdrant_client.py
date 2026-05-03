"""Tests for Qdrant search client."""

from unittest.mock import MagicMock, Mock, patch

import numpy as np
import pytest

from src.qdrant_client import QdrantSearchClient


@pytest.fixture
def mock_qdrant_client():
    """Provide a mock Qdrant client."""
    return Mock()


class TestQdrantSearchClient:
    def test_init(self, test_config):
        client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
        assert client.url == test_config.qdrant_url
        assert client.collection_name == test_config.qdrant_collection
        assert client._client is None

    def test_lazy_client_initialization(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant:
            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            _ = client.client
            mock_qdrant.assert_called_once_with(url=test_config.qdrant_url)

    def test_search(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant_class:
            mock_client = Mock()
            mock_qdrant_class.return_value = mock_client

            # Mock search results
            mock_result = Mock()
            mock_result.id = "chunk-1"
            mock_result.score = 0.95
            mock_result.payload = {
                "text": "test content",
                "document_id": "doc-1",
                "project_id": "proj-1",
                "chunk_index": 0,
                "filename": "test.pdf",
            }
            mock_client.query_points.return_value = MagicMock(points=[mock_result])

            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            client._client = mock_client
            
            dense_vector = [0.1] * 384
            sparse_vector = MagicMock(
                indices=np.array([1, 5], dtype=np.int32),
                values=np.array([0.5, 0.8], dtype=np.float32),
            )
            results = client.search(dense_vector=dense_vector, sparse_vector=sparse_vector, limit=10)

            assert len(results) == 1
            assert results[0]["id"] == "chunk-1"
            assert results[0]["score"] == 0.95
            mock_client.query_points.assert_called_once()

    def test_search_with_filter(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant_class:
            mock_client = Mock()
            mock_qdrant_class.return_value = mock_client
            mock_client.query_points.return_value = MagicMock(points=[])

            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            client._client = mock_client
            
            dense_vector = [0.1] * 384
            sparse_vector = MagicMock(
                indices=np.array([1, 5], dtype=np.int32),
                values=np.array([0.5, 0.8], dtype=np.float32),
            )
            
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            filter_obj = Filter(
                must=[FieldCondition(key="project_id", match=MatchValue(value="123"))]
            )
            
            client.search(dense_vector=dense_vector, sparse_vector=sparse_vector, limit=5, filter_obj=filter_obj, score_threshold=0.8)

            call_args = mock_client.query_points.call_args
            assert call_args.kwargs['limit'] == 5
            assert call_args.kwargs['score_threshold'] == 0.8

    def test_health_check_success(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant_class:
            mock_client = Mock()
            mock_qdrant_class.return_value = mock_client
            mock_client.get_collection.return_value = Mock()

            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            assert client.health_check() is True

    def test_health_check_failure(self, test_config):
        with patch('src.qdrant_client.QdrantClient') as mock_qdrant_class:
            mock_client = Mock()
            mock_qdrant_class.return_value = mock_client
            mock_client.get_collection.side_effect = Exception("Connection refused")

            client = QdrantSearchClient(test_config.qdrant_url, test_config.qdrant_collection)
            assert client.health_check() is False


def test_hybrid_search(mock_qdrant_client):
    """Should search with both dense and sparse vectors."""
    from src.qdrant_client import QdrantSearchClient

    client = QdrantSearchClient("http://localhost:6333", "test-collection")
    client._client = mock_qdrant_client

    # Mock response
    mock_response = MagicMock()
    mock_response.points = [
        MagicMock(id="point-1", score=0.85, payload={"text": "Backend Engineer"}),
    ]
    mock_qdrant_client.query_points.return_value = mock_response

    dense_vector = [0.1, 0.2, 0.3]
    sparse_vector = MagicMock(
        indices=np.array([1, 5], dtype=np.int32),
        values=np.array([0.5, 0.8], dtype=np.float32),
    )

    results = client.search(
        dense_vector=dense_vector,
        sparse_vector=sparse_vector,
        limit=5,
    )

    assert len(results) == 1
    assert results[0]["score"] == 0.85
    mock_qdrant_client.query_points.assert_called_once()
