import pytest
from unittest.mock import Mock, patch
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
                mock_client.upsert_chunks.assert_called_once()
                call_args = mock_client.upsert_chunks.call_args[0][0]
                assert len(call_args) == 1
                assert call_args[0]["id"] == "chunk-1"
                assert call_args[0]["payload"]["document_id"] == "doc-1"
                mock_tracker.mark_chunk_embedded.assert_called_once_with("doc-1", 1)
                mock_tracker.is_complete.assert_called_once_with("doc-1", 1)
                mock_tracker.cleanup.assert_called_once_with("doc-1")
