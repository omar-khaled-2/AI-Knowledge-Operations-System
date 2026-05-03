import numpy as np
import pytest
from unittest.mock import MagicMock, Mock, patch
from src.jobs import embed_chunk


def test_embed_chunk_creates_vector():
    chunk_data = {
        "chunk_id": "chunk-1",
        "document_id": "doc-1",
        "project_id": "proj-1",
        "chunk_index": 0,
        "text": "Hello world",
        "filename": "test.txt",
        "total_chunks": 1,
    }

    with patch('src.jobs.EmbeddingModel') as mock_model_class:
        mock_model = Mock()
        mock_model.embed.return_value = [0.1] * 384
        mock_model_class.return_value = mock_model

        with patch('src.jobs.SparseEmbeddingModel') as mock_sparse_class:
            mock_sparse = Mock()
            mock_sparse.embed.return_value = MagicMock(
                indices=np.array([1, 2], dtype=np.int32),
                values=np.array([0.5, 0.8], dtype=np.float32),
            )
            mock_sparse_class.return_value = mock_sparse

            with patch('src.jobs.QdrantVectorClient') as mock_client_class:
                mock_client = Mock()
                mock_client.ensure_collection.return_value = None
                mock_client.upsert_chunks.return_value = None
                mock_client_class.return_value = mock_client

                with patch('src.jobs.ChunkTracker') as mock_tracker_class:
                    mock_tracker = Mock()
                    mock_tracker.mark_chunk_embedded.return_value = 1
                    mock_tracker.is_complete.return_value = True
                    mock_tracker_class.return_value = mock_tracker

                    embed_chunk(chunk_data)

                    mock_model.embed.assert_called_once_with("Hello world")
                    mock_sparse.embed.assert_called_once_with("Hello world")
                    mock_client.upsert_chunks.assert_called_once()
                    call_args = mock_client.upsert_chunks.call_args[0][0]
                    assert len(call_args) == 1
                    assert call_args[0]["id"] == "chunk-1"
                    assert call_args[0]["payload"]["document_id"] == "doc-1"
                    assert "dense" in call_args[0]["vector"]
                    assert "sparse" in call_args[0]["vector"]
                    mock_tracker.mark_chunk_embedded.assert_called_once_with("doc-1", 1)
                    mock_tracker.is_complete.assert_called_once_with("doc-1", 1)
                    mock_tracker.cleanup.assert_called_once_with("doc-1")


@patch("src.jobs.SparseEmbeddingModel")
@patch("src.jobs.QdrantVectorClient")
@patch("src.jobs.EmbeddingModel")
@patch("src.jobs.Config")
def test_embed_chunk_with_sparse_vector(mock_config, mock_embedding_model, mock_qdrant, mock_sparse_model):
    """Job should generate both dense and sparse vectors."""
    from src.jobs import embed_chunk
    
    mock_config.from_env.return_value = MagicMock(
        qdrant_url="http://localhost:6333",
        qdrant_collection="test",
        openai_api_key="test-key",
        embedding_model="text-embedding-3-small",
        backend_url="",
        redis_url="redis://localhost:6379",
    )
    
    mock_embedding_model.return_value.embed.return_value = [0.1, 0.2, 0.3]
    mock_sparse_model.return_value.embed.return_value = MagicMock(
        indices=np.array([1, 2], dtype=np.int32),
        values=np.array([0.5, 0.8], dtype=np.float32),
    )
    
    with patch('src.jobs.ChunkTracker') as mock_tracker_class:
        mock_tracker = Mock()
        mock_tracker.mark_chunk_embedded.return_value = 1
        mock_tracker.is_complete.return_value = False
        mock_tracker_class.return_value = mock_tracker
        
        embed_chunk({
            "chunk_id": "chunk-1",
            "document_id": "doc-1",
            "project_id": "proj-1",
            "chunk_index": 0,
            "text": "hello world",
            "filename": "test.txt",
            "total_chunks": 1,
        })
    
    mock_qdrant.return_value.upsert_chunks.assert_called_once()
    call_args = mock_qdrant.return_value.upsert_chunks.call_args[0][0]
    assert "dense" in call_args[0]["vector"]
    assert "sparse" in call_args[0]["vector"]
