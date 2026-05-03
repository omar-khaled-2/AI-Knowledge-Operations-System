import pytest
from unittest.mock import Mock, patch
from src.services.backend_client import BackendClient


def test_save_insights_posts_to_backend():
    with patch("src.services.backend_client.httpx.Client") as mock_client_class:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True, "createdCount": 2}

        mock_client = Mock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value = mock_client

        backend = BackendClient("http://backend:80")
        result = backend.save_insights(
            "proj-456",
            "doc-123",
            [
                {
                    "type": "action-item",
                    "title": "Test",
                    "description": "Desc",
                    "confidence": 0.9,
                }
            ],
        )

        assert result["success"] is True
        assert result["createdCount"] == 2
