import pytest
from unittest.mock import Mock, patch
from src.jobs import enqueue_embedding_jobs


def test_enqueue_embedding_jobs_creates_rq_jobs():
    mock_queue = Mock()
    mock_queue.enqueue.return_value = Mock(id="job-123")

    chunks = ["chunk 1", "chunk 2"]
    with patch('src.jobs.Queue', return_value=mock_queue):
        enqueue_embedding_jobs(
            document_id="doc-123",
            project_id="proj-456",
            chunks=chunks,
            filename="test.pdf"
        )

    assert mock_queue.enqueue.call_count == 2
