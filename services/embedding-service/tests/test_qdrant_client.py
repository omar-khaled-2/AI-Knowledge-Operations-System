import pytest
from unittest.mock import Mock, patch
from src.qdrant_client import QdrantVectorClient


@pytest.fixture
def mock_qdrant_client():
    client = Mock()
    client.upsert.return_value = None
    return client


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


def test_upsert_with_sparse_vector(mock_qdrant_client):
    """Should upsert point with both dense and sparse vectors."""
    import numpy as np
    from qdrant_client import models
    
    client = QdrantVectorClient("http://localhost:6333", "test-collection")
    client._client = mock_qdrant_client
    
    client.upsert_chunks([
        {
            "id": "chunk-1",
            "vector": {
                "dense": [0.1, 0.2, 0.3],
                "sparse": {
                    "indices": np.array([1, 5, 10], dtype=np.int32),
                    "values": np.array([0.5, 0.3, 0.8], dtype=np.float32),
                },
            },
            "payload": {"text": "test", "project_id": "proj-1"},
        }
    ])
    
    mock_qdrant_client.upsert.assert_called_once()
    call_args = mock_qdrant_client.upsert.call_args
    points = call_args[1]["points"]
    assert len(points) == 1
    vector = points[0].vector
    assert vector["dense"] == [0.1, 0.2, 0.3]
    assert vector["sparse"].indices == [1, 5, 10]
    assert vector["sparse"].values == np.array([0.5, 0.3, 0.8], dtype=np.float32).tolist()
