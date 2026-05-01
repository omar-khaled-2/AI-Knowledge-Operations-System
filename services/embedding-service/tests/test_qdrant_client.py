import pytest
from unittest.mock import Mock, patch
from src.qdrant_client import QdrantVectorClient


def test_upsert_chunks():
    mock_client = Mock()
    mock_client.upsert.return_value = None

    with patch('src.qdrant_client.QdrantClient', return_value=mock_client):
        vector_client = QdrantVectorClient("http://localhost:6333", "test-collection")

        points = [
            {
                "id": "chunk-1",
                "vector": [0.1, 0.2, 0.3],
                "payload": {"text": "Hello", "document_id": "doc-1"},
            }
        ]
        vector_client.upsert_chunks(points)

    mock_client.upsert.assert_called_once()
    call_args = mock_client.upsert.call_args
    assert call_args[1]["collection_name"] == "test-collection"
