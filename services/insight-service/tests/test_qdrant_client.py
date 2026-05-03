import pytest
from unittest.mock import Mock, patch
from src.services.qdrant_client import QdrantInsightClient

def test_get_document_chunks():
    mock_client = Mock()
    mock_client.scroll.return_value = ([
        Mock(payload={"text": "chunk 1", "document_id": "doc-123"}),
        Mock(payload={"text": "chunk 2", "document_id": "doc-123"}),
    ], None)

    with patch('src.services.qdrant_client.QdrantClient', return_value=mock_client):
        client = QdrantInsightClient("http://localhost:6333", "documents")
        chunks = client.get_document_chunks("doc-123")

    assert len(chunks) == 2
    assert chunks[0] == "chunk 1"
    assert chunks[1] == "chunk 2"

def test_get_document_chunks_empty():
    mock_client = Mock()
    mock_client.scroll.return_value = ([], None)

    with patch('src.services.qdrant_client.QdrantClient', return_value=mock_client):
        client = QdrantInsightClient("http://localhost:6333", "documents")
        chunks = client.get_document_chunks("doc-123")

    assert len(chunks) == 0
