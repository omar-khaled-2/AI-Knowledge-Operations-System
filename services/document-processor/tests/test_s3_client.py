import pytest
import tempfile
import os
from unittest.mock import Mock, patch
from src.s3_client import S3Client


def test_s3_client_downloads_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        client = S3Client(bucket="test-bucket", region="us-east-1")

        # Mock boto3 client
        mock_s3 = Mock()
        mock_s3.download_file.return_value = None

        with patch('boto3.client', return_value=mock_s3):
            dest_path = os.path.join(tmpdir, "downloaded.pdf")
            client.download_file("projects/123/doc.pdf", dest_path)

        mock_s3.download_file.assert_called_once_with(
            "test-bucket", "projects/123/doc.pdf", dest_path
        )
