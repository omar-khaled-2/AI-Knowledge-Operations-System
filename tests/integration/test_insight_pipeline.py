import pytest
import requests
import time

BASE_URL = "http://localhost:3001"


def test_insights_api():
    """Test that insights endpoint is accessible."""
    response = requests.get(f"{BASE_URL}/insights?projectId=proj-test")
    # Should return 401 without auth, or 200 with auth
    assert response.status_code in [200, 401]


def test_internal_insights_api():
    """Test internal insights endpoint."""
    payload = {
        "projectId": "proj-test",
        "sourceDocumentId": "doc-test",
        "insights": [
            {
                "type": "action-item",
                "title": "Test insight",
                "description": "Test description",
                "confidence": 0.9,
            }
        ],
    }
    response = requests.post(f"{BASE_URL}/internal/insights", json=payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
