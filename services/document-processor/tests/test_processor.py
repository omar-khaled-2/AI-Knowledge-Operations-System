import pytest
import tempfile
import os
from unittest.mock import Mock, patch
from src.processor import process_document


def test_process_document_parses_and_chunks():
    event_data = {
        "documentId": "doc-123",
        "objectKey": "projects/456/documents/doc-123/file.pdf",
        "mimeType": "text/plain",
        "filename": "test.txt",
        "projectId": "proj-456",
        "uploadedBy": "user@example.com",
    }

    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("Hello world. This is a test document.")
        temp_path = f.name

    try:
        with patch('src.processor.S3Client') as mock_s3_class:
            mock_s3 = Mock()
            mock_s3.download_file = Mock(side_effect=lambda key, dest: os.replace(temp_path, dest))
            mock_s3_class.return_value = mock_s3

            with patch('src.processor.enqueue_embedding_jobs') as mock_enqueue:
                mock_enqueue.return_value = ["job-1", "job-2"]

                result = process_document(event_data)

                assert result is True
                mock_enqueue.assert_called_once()
                call_args = mock_enqueue.call_args
                assert call_args[1]["document_id"] == "doc-123"
                assert call_args[1]["project_id"] == "proj-456"
                assert call_args[1]["filename"] == "test.txt"
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
